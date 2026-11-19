// Flight search, lookup and seat-map generation.
import type { Airline, Airport, Cabin, Fare, Flight, FlightSearchQuery, Seat, SeatMap } from '@workbench/shared';
import { getDb } from '../db/connection.ts';
import { layoutFor } from '../db/seed-data.ts';
import { durationMinutes } from '../lib/time.ts';

/** Raw row shape returned by the flight query below (joined with airline + airports). */
interface FlightRow {
  id: string;
  flight_number: string;
  departure: string;
  arrival: string;
  aircraft: string;
  stops: number;
  al_code: string;
  al_name: string;
  al_logo: string;
  al_alliance: Airline['alliance'];
  o_code: string;
  o_name: string;
  o_city: string;
  o_country: string;
  o_tz: string;
  d_code: string;
  d_name: string;
  d_city: string;
  d_country: string;
  d_tz: string;
}

const FLIGHT_SELECT = `
  SELECT f.id, f.flight_number, f.departure, f.arrival, f.aircraft, f.stops,
         al.code AS al_code, al.name AS al_name, al.logo AS al_logo, al.alliance AS al_alliance,
         o.code AS o_code, o.name AS o_name, o.city AS o_city, o.country AS o_country, o.tz AS o_tz,
         d.code AS d_code, d.name AS d_name, d.city AS d_city, d.country AS d_country, d.tz AS d_tz
  FROM flights f
  JOIN airlines al ON al.code = f.airline_code
  JOIN airports o  ON o.code = f.origin
  JOIN airports d  ON d.code = f.destination`;

type FareRow = { flight_id: string; family: Fare['family']; cabin: Cabin; price: number; seats_left: number };

/** Loads fares for many flights in one query, grouped by flight id, each list cheapest first. */
function faresByFlight(flightIds: string[], cabin?: Cabin): Map<string, Fare[]> {
  const byFlight = new Map<string, Fare[]>(flightIds.map((id) => [id, []]));
  if (flightIds.length === 0) return byFlight;
  const rows = getDb()
    .prepare(
      `SELECT flight_id, family, cabin, price, seats_left FROM fares
       WHERE flight_id IN (SELECT value FROM json_each(?)) ${cabin ? 'AND cabin = ?' : ''}
       ORDER BY flight_id, price ASC`,
    )
    .all(...(cabin ? [JSON.stringify(flightIds), cabin] : [JSON.stringify(flightIds)])) as FareRow[];
  for (const r of rows) {
    byFlight
      .get(r.flight_id)!
      .push({ family: r.family, cabin: r.cabin, price: r.price, currency: 'EUR', seatsLeft: r.seats_left });
  }
  return byFlight;
}

/** Maps a joined DB row to the API `Flight` shape. */
function toFlight(r: FlightRow, fares: Fare[]): Flight {
  const airline: Airline = { code: r.al_code, name: r.al_name, logo: r.al_logo, alliance: r.al_alliance };
  const origin: Airport = { code: r.o_code, name: r.o_name, city: r.o_city, country: r.o_country, tz: r.o_tz };
  const destination: Airport = { code: r.d_code, name: r.d_name, city: r.d_city, country: r.d_country, tz: r.d_tz };
  return {
    id: r.id,
    flightNumber: r.flight_number,
    airline,
    origin,
    destination,
    departure: r.departure,
    arrival: r.arrival,
    durationMinutes: durationMinutes(r.departure, r.arrival),
    aircraft: r.aircraft,
    stops: r.stops,
    fares,
  };
}

/** Finds flights departing `origin` for `destination` on the given local date. */
export function searchFlights(q: FlightSearchQuery): Flight[] {
  const rows = getDb()
    .prepare(`${FLIGHT_SELECT} WHERE f.origin = ? AND f.destination = ? AND f.departure LIKE ? ORDER BY f.departure`)
    .all(q.origin, q.destination, `${q.date}%`) as FlightRow[];
  const fares = faresByFlight(
    rows.map((r) => r.id),
    q.cabin,
  );
  return (
    rows
      .map((r) => toFlight(r, fares.get(r.id)!))
      // Hide flights that can't seat the whole party in any fare.
      .filter((f) => f.fares.some((fare) => fare.seatsLeft >= q.passengers))
  );
}

/** Loads one flight by id, or null. */
export function getFlight(id: string): Flight | null {
  const row = getDb().prepare(`${FLIGHT_SELECT} WHERE f.id = ?`).get(id) as FlightRow | undefined;
  return row ? toFlight(row, faresByFlight([row.id]).get(row.id)!) : null;
}

/** Builds the seat map for a flight from its aircraft layout plus sold seats. */
export function getSeatMap(flightId: string): SeatMap | null {
  const flight = getFlight(flightId);
  if (!flight) return null;

  const taken = new Set(
    (getDb().prepare('SELECT seat_number FROM seat_assignments WHERE flight_id = ?').all(flightId) as {
      seat_number: string;
    }[]).map((r) => r.seat_number),
  );

  const layout = layoutFor(flight.aircraft);
  const rows: Seat[][] = [];

  const buildCabin = (cabin: Cabin, def: typeof layout.economy | typeof layout.business, exitRows: number[]) => {
    for (let row = def.rows[0]; row <= def.rows[1]; row++) {
      const seats: Seat[] = def.letters.map((letter, i) => {
        const exitRow = exitRows.includes(row);
        const aisle = def.aisleAfter.includes(i) || def.aisleAfter.includes(i - 1);
        const extraLegroom = exitRow || row === def.rows[0];
        return {
          number: `${row}${letter}`,
          row,
          letter,
          cabin,
          exitRow,
          extraLegroom,
          window: i === 0 || i === def.letters.length - 1,
          aisle,
          taken: taken.has(`${row}${letter}`),
          price: cabin === 'BUSINESS' ? 0 : extraLegroom ? 45 : row <= def.rows[0] + 5 ? 18 : 0,
        };
      });
      rows.push(seats);
    }
  };

  buildCabin('BUSINESS', layout.business, []);
  buildCabin('ECONOMY', layout.economy, layout.economy.exitRows);

  return { flightId, aircraft: flight.aircraft, layout: layout.layout, rows };
}

/** Airport typeahead: matches code, city or name. */
export function searchAirports(q: string): Airport[] {
  const like = `%${q}%`;
  return getDb()
    .prepare(
      `SELECT code, name, city, country, tz FROM airports
       WHERE code LIKE ? OR city LIKE ? OR name LIKE ? ORDER BY city LIMIT 10`,
    )
    .all(like, like, like) as Airport[];
}

export function listAirlines(): Airline[] {
  return getDb().prepare('SELECT code, name, logo, alliance FROM airlines ORDER BY name').all() as Airline[];
}
