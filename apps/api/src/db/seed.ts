// Seeds the SQLite database with reference data, a rolling window of flights,
// fares, pre-existing seat occupancy and a couple of demo PNRs.
//
// Run with `npm run seed` (from the repo root). Safe to re-run: it wipes and rebuilds.
import type Database from 'better-sqlite3';
import { getDb, DB_PATH } from './connection.ts';
import { AIRLINES, AIRPORTS, ROUTES, layoutFor } from './seed-data.ts';
import { localToInstant, instantToLocal, isoDate } from '../lib/time.ts';

/** Days of schedule to generate, starting today. */
const DAYS = 45;

/** Deterministic PRNG (mulberry32) so seed output is stable between runs. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wipes all tables. */
function reset(db: Database.Database) {
  db.exec(`
    DELETE FROM pnr_segments; DELETE FROM pnr_passengers; DELETE FROM pnrs;
    DELETE FROM seat_assignments; DELETE FROM fares; DELETE FROM flights;
    DELETE FROM airports; DELETE FROM airlines;
  `);
}

function seedReference(db: Database.Database) {
  const insAirline = db.prepare('INSERT INTO airlines (code, name, logo, alliance) VALUES (?, ?, ?, ?)');
  for (const a of AIRLINES) insAirline.run(a.code, a.name, a.logo, a.alliance);

  const insAirport = db.prepare('INSERT INTO airports (code, name, city, country, tz) VALUES (?, ?, ?, ?, ?)');
  for (const a of AIRPORTS) insAirport.run(a.code, a.name, a.city, a.country, a.tz);
}

/** Generates one flight per route per day for the next `DAYS` days. */
function seedFlights(db: Database.Database) {
  const tzOf = new Map(AIRPORTS.map((a) => [a.code, a.tz]));
  const insFlight = db.prepare(`
    INSERT INTO flights (id, flight_number, airline_code, origin, destination, departure, arrival, aircraft, stops)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insFare = db.prepare(
    'INSERT INTO fares (flight_id, family, cabin, price, seats_left) VALUES (?, ?, ?, ?, ?)',
  );
  const insSeat = db.prepare(
    'INSERT INTO seat_assignments (flight_id, seat_number, pnr_locator) VALUES (?, ?, NULL)',
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let day = 0; day < DAYS; day++) {
    const date = isoDate(new Date(today.getTime() + day * 86_400_000));
    for (const r of ROUTES) {
      const flightNumber = `${r.airline}${r.number}`;
      const id = `${flightNumber}-${date}`;
      const departureLocal = `${date}T${r.dep}:00`;
      // Arrival is computed in the DESTINATION's local time from the absolute instant.
      const depInstant = localToInstant(departureLocal, tzOf.get(r.from)!);
      const arrInstant = new Date(depInstant.getTime() + r.mins * 60_000);
      const arrivalLocal = instantToLocal(arrInstant, tzOf.get(r.to)!);

      insFlight.run(id, flightNumber, r.airline, r.from, r.to, departureLocal, arrivalLocal, r.aircraft, r.stops ?? 0);

      // Prices drift a little day-to-day and rise as departure approaches.
      const random = rng(hash(id));
      const demand = 1 + (DAYS - day) / DAYS * 0.35 + (random() - 0.5) * 0.2;
      const eco = Math.round(r.base * demand * 100) / 100;
      insFare.run(id, 'LIGHT', 'ECONOMY', round2(eco * 0.82), 3 + Math.floor(random() * 9));
      insFare.run(id, 'STANDARD', 'ECONOMY', eco, 5 + Math.floor(random() * 30));
      insFare.run(id, 'FLEX', 'ECONOMY', round2(eco * 1.45), 9);
      insFare.run(id, 'STANDARD', 'BUSINESS', round2(eco * 3.6), 2 + Math.floor(random() * 6));
      insFare.run(id, 'FLEX', 'BUSINESS', round2(eco * 4.4), 4);

      // Pre-seed ~35% occupancy so the seat map looks lived-in.
      const layout = layoutFor(r.aircraft);
      for (const cabin of [layout.business, layout.economy]) {
        for (let row = cabin.rows[0]; row <= cabin.rows[1]; row++) {
          for (const letter of cabin.letters) {
            if (random() < 0.35) insSeat.run(id, `${row}${letter}`);
          }
        }
      }
    }
  }
}

/** Two demo PNRs so RT commands and the "my bookings" page have data on first run. */
function seedPnrs(db: Database.Database) {
  const tomorrow = isoDate(new Date(Date.now() + 86_400_000));
  const nextWeek = isoDate(new Date(Date.now() + 7 * 86_400_000));
  const demo = [
    {
      locator: 'X7K2PQ',
      email: 'amelie.durand@example.com',
      flightId: `BA0117-${nextWeek}`,
      family: 'STANDARD',
      pax: [['MS', 'AMELIE', 'DURAND', '1988-04-12']],
      seats: ['14A'],
    },
    {
      locator: 'M3JR8T',
      email: 'james.okafor@example.com',
      flightId: `SQ0322-${tomorrow}`,
      family: 'FLEX',
      pax: [
        ['MR', 'JAMES', 'OKAFOR', '1975-11-02'],
        ['MRS', 'CHIOMA', 'OKAFOR', '1979-06-23'],
      ],
      seats: ['22D', '22E'],
    },
  ] as const;

  // Totals are derived from the seeded fare so demo PNRs agree with what the GUI would have charged.
  const farePrice = db.prepare('SELECT price FROM fares WHERE flight_id = ? AND family = ? AND cabin = ?');

  const insPnr = db.prepare(
    'INSERT INTO pnrs (locator, status, created_at, contact_email, total_price, currency) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insPax = db.prepare(`
    INSERT INTO pnr_passengers (pnr_locator, idx, type, title, first_name, last_name, date_of_birth, email)
    VALUES (?, ?, 'ADT', ?, ?, ?, ?, ?)`);
  const insSeg = db.prepare(
    'INSERT INTO pnr_segments (pnr_locator, idx, flight_id, fare_family, cabin, seats_json) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insSeat = db.prepare(
    'INSERT OR REPLACE INTO seat_assignments (flight_id, seat_number, pnr_locator) VALUES (?, ?, ?)',
  );

  for (const d of demo) {
    const fare = farePrice.get(d.flightId, d.family, 'ECONOMY') as { price: number } | undefined;
    const total = round2((fare?.price ?? 0) * d.pax.length);
    insPnr.run(d.locator, 'HK', new Date().toISOString(), d.email, total, 'EUR');
    d.pax.forEach(([title, first, last, dob], i) => insPax.run(d.locator, i, title, first, last, dob, d.email));
    insSeg.run(d.locator, 0, d.flightId, d.family, 'ECONOMY', JSON.stringify(d.seats));
    for (const s of d.seats) insSeat.run(d.flightId, s, d.locator);
  }
}

/** Tiny string hash for per-flight PRNG seeding. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Entry point: rebuilds the whole database inside one transaction. */
export function seed(db: Database.Database = getDb()) {
  db.transaction(() => {
    reset(db);
    seedReference(db);
    seedFlights(db);
    seedPnrs(db);
  })();
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && /seed\.ts$/.test(process.argv[1])) {
  const db = getDb();
  seed(db);
  const flights = db.prepare('SELECT COUNT(*) AS n FROM flights').get() as { n: number };
  const seats = db.prepare('SELECT COUNT(*) AS n FROM seat_assignments').get() as { n: number };
  console.log(`Seeded ${flights.n} flights and ${seats.n} seat assignments into ${DB_PATH}`);
}
