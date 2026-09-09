// PNR (booking) creation and retrieval.
import type { BookedSegment, CreateBookingRequest, Passenger, Pnr, PnrStatus } from '@workbench/shared';
import { getDb } from '../db/connection.ts';
import { getFlight } from './flights.service.ts';

/** Characters used in booking references. Amadeus locators avoid ambiguous chars like 0/O and 1/I. */
const LOCATOR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Generates a 6-character record locator that is not already in use. */
export function generateLocator(): string {
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM pnrs WHERE locator = ?');
  for (;;) {
    let out = '';
    for (let i = 0; i < 6; i++) out += LOCATOR_ALPHABET[Math.floor(Math.random() * LOCATOR_ALPHABET.length)];
    if (!exists.get(out)) return out;
  }
}

export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/**
 * Creates a PNR for one flight segment.
 * Validates the fare and availability, decrements inventory and records seats.
 */
export function createBooking(req: CreateBookingRequest): Pnr {
  const db = getDb();
  const flight = getFlight(req.flightId);
  if (!flight) throw new BookingError('Flight not found', 404);

  const fare = flight.fares.find((f) => f.family === req.fareFamily && f.cabin === 'ECONOMY') ??
    flight.fares.find((f) => f.family === req.fareFamily);
  if (!fare) throw new BookingError(`Fare family ${req.fareFamily} not offered on this flight`);
  if (fare.seatsLeft < req.passengers.length) throw new BookingError('Not enough seats left at this fare', 409);
  if (req.seats.length !== req.passengers.length) throw new BookingError('One seat entry per passenger is required');

  const seatSurcharge = req.seats.filter(Boolean).length * 0; // seat pricing is added by the seat-map step later
  const total = round2(fare.price * req.passengers.length + seatSurcharge);
  const locator = generateLocator();
  const createdAt = new Date().toISOString();

  db.transaction(() => {
    db.prepare(
      'INSERT INTO pnrs (locator, status, created_at, contact_email, total_price, currency) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(locator, 'HK', createdAt, req.contactEmail, total, 'EUR');

    const insPax = db.prepare(`
      INSERT INTO pnr_passengers (pnr_locator, idx, type, title, first_name, last_name, date_of_birth, email, phone, frequent_flyer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    req.passengers.forEach((p, i) =>
      insPax.run(locator, i, p.type, p.title, p.firstName.toUpperCase(), p.lastName.toUpperCase(), p.dateOfBirth,
        p.email ?? null, p.phone ?? null, p.frequentFlyer ?? null),
    );

    db.prepare(
      'INSERT INTO pnr_segments (pnr_locator, idx, flight_id, fare_family, cabin, seats_json) VALUES (?, 0, ?, ?, ?, ?)',
    ).run(locator, flight.id, fare.family, fare.cabin, JSON.stringify(req.seats));

    // Record chosen seats against the flight so the seat map shows them as taken.
    const insSeat = db.prepare(
      'INSERT OR REPLACE INTO seat_assignments (flight_id, seat_number, pnr_locator) VALUES (?, ?, ?)',
    );
    for (const seat of req.seats) if (seat) insSeat.run(flight.id, seat, locator);

    db.prepare('UPDATE fares SET seats_left = seats_left - ? WHERE flight_id = ? AND family = ? AND cabin = ?').run(
      req.passengers.length, flight.id, fare.family, fare.cabin,
    );
  })();

  return getPnr(locator)!;
}

/** Loads a PNR with passengers and segments, or null if the locator is unknown. */
export function getPnr(locator: string): Pnr | null {
  const db = getDb();
  const head = db
    .prepare('SELECT locator, status, created_at, contact_email, total_price, currency FROM pnrs WHERE locator = ?')
    .get(locator.toUpperCase()) as
    | { locator: string; status: PnrStatus; created_at: string; contact_email: string; total_price: number; currency: 'EUR' }
    | undefined;
  if (!head) return null;

  const passengers = (
    db
      .prepare(
        `SELECT type, title, first_name, last_name, date_of_birth, email, phone, frequent_flyer
         FROM pnr_passengers WHERE pnr_locator = ? ORDER BY idx`,
      )
      .all(head.locator) as {
      type: Passenger['type'];
      title: Passenger['title'];
      first_name: string;
      last_name: string;
      date_of_birth: string;
      email: string | null;
      phone: string | null;
      frequent_flyer: string | null;
    }[]
  ).map<Passenger>((p) => ({
    type: p.type,
    title: p.title,
    firstName: p.first_name,
    lastName: p.last_name,
    dateOfBirth: p.date_of_birth,
    email: p.email ?? undefined,
    phone: p.phone ?? undefined,
    frequentFlyer: p.frequent_flyer ?? undefined,
  }));

  const segments = (
    db
      .prepare('SELECT flight_id, fare_family, cabin, seats_json FROM pnr_segments WHERE pnr_locator = ? ORDER BY idx')
      .all(head.locator) as { flight_id: string; fare_family: BookedSegment['fareFamily']; cabin: BookedSegment['cabin']; seats_json: string }[]
  ).map<BookedSegment>((s) => ({
    flight: getFlight(s.flight_id)!,
    fareFamily: s.fare_family,
    cabin: s.cabin,
    seats: JSON.parse(s.seats_json),
  }));

  return {
    locator: head.locator,
    status: head.status,
    createdAt: head.created_at,
    passengers,
    segments,
    contactEmail: head.contact_email,
    totalPrice: head.total_price,
    currency: head.currency,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
