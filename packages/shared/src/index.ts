// Shared domain types and API contract used by both `apps/api` and `apps/web`.
// Keep this file free of runtime dependencies so it can be imported anywhere.

/** IATA airline record. `logo` is the filename under apps/web/src/assets/logos. */
export interface Airline {
  code: string; // 2-letter IATA code, e.g. "BA"
  name: string; // "British Airways"
  logo: string; // "BA.svg"
  alliance: 'oneworld' | 'star' | 'skyteam' | null;
}

/** IATA airport record. `tz` is an IANA timezone name used for local-time handling. */
export interface Airport {
  code: string; // 3-letter IATA code, e.g. "LHR"
  name: string; // "London Heathrow"
  city: string; // "London"
  country: string; // "United Kingdom"
  tz: string; // "Europe/London"
}

/** Fare families roughly mirror the branded fares most European carriers sell. */
export type FareFamily = 'LIGHT' | 'STANDARD' | 'FLEX';

export const FARE_FAMILIES: FareFamily[] = ['LIGHT', 'STANDARD', 'FLEX'];

/** Cabin class. Only economy and business are seeded. */
export type Cabin = 'ECONOMY' | 'BUSINESS';

/** Price for one fare family on one flight. Amounts are plain EUR decimals. */
export interface Fare {
  family: FareFamily;
  cabin: Cabin;
  price: number; // EUR, e.g. 129.99
  currency: 'EUR';
  seatsLeft: number; // how many seats remain at this fare
}

/**
 * A single flight segment (one take-off, one landing).
 *
 * `departure` and `arrival` are LOCAL wall-clock times at the respective airport,
 * stored as ISO-8601 strings WITHOUT an offset (e.g. "2026-09-16T21:35:00").
 * Use the airport `tz` to convert to an absolute instant.
 */
export interface Flight {
  id: string; // stable id, e.g. "BA0011-2026-09-16"
  flightNumber: string; // "BA0011"
  airline: Airline;
  origin: Airport;
  destination: Airport;
  departure: string; // local ISO without offset
  arrival: string; // local ISO without offset
  durationMinutes: number; // block time, computed server-side
  aircraft: string; // "Boeing 777-300ER"
  stops: number; // 0 for non-stop
  fares: Fare[];
}

/** Query parameters accepted by GET /api/flights/search. */
export interface FlightSearchQuery {
  origin: string; // IATA
  destination: string; // IATA
  date: string; // YYYY-MM-DD (local date at origin)
  passengers: number; // 1-9
  cabin?: Cabin;
}

export interface FlightSearchResponse {
  query: FlightSearchQuery;
  results: Flight[];
}

/** Seat availability on a seat map. `taken` seats must not be selectable. */
export interface Seat {
  number: string; // "12A"
  row: number;
  letter: string; // "A"
  cabin: Cabin;
  exitRow: boolean;
  extraLegroom: boolean;
  window: boolean;
  aisle: boolean;
  taken: boolean;
  price: number; // EUR surcharge for choosing this seat; 0 when free
}

export interface SeatMap {
  flightId: string;
  aircraft: string;
  layout: string; // e.g. "3-3" or "2-4-2"
  rows: Seat[][]; // rows[rowIndex] = seats in that row, left to right
}

export type PassengerType = 'ADT' | 'CHD' | 'INF';

export interface Passenger {
  type: PassengerType;
  title: 'MR' | 'MRS' | 'MS' | 'DR';
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  email?: string;
  phone?: string;
  frequentFlyer?: string;
}

/** A booked segment inside a PNR. `seat` is the seat assigned to each passenger by index. */
export interface BookedSegment {
  flight: Flight;
  fareFamily: FareFamily;
  cabin: Cabin;
  seats: (string | null)[]; // seats[passengerIndex] -> "12A" or null if unassigned
}

export type PnrStatus = 'HK' | 'HL' | 'XX'; // confirmed / waitlisted / cancelled (Amadeus status codes)

/** A Passenger Name Record. `locator` is the 6-char alphanumeric booking reference. */
export interface Pnr {
  locator: string; // e.g. "X7K2PQ"
  status: PnrStatus;
  createdAt: string; // ISO instant (UTC)
  passengers: Passenger[];
  segments: BookedSegment[];
  contactEmail: string;
  totalPrice: number; // EUR
  currency: 'EUR';
}

/** Body accepted by POST /api/bookings. */
export interface CreateBookingRequest {
  flightId: string;
  fareFamily: FareFamily;
  passengers: Passenger[];
  seats: (string | null)[];
  contactEmail: string;
}

/**
 * Cryptic terminal contract (Amadeus Selling Platform style).
 * Example commands:
 *   AN20SEPLHRJFK      availability, 20 Sep, LHR -> JFK
 *   AN20SEPLHRJFK/AAF  ... filtered to Air France
 *   SS1Y2              sell 1 seat, class Y, line 2 of last availability
 *   RT                 retrieve the current PNR
 *   RTX7K2PQ           retrieve PNR X7K2PQ
 *   HE AN              help for AN
 */
export interface TerminalCommandRequest {
  command: string;
  sessionId: string; // client-generated; keeps "last availability" state server-side
}

export interface TerminalCommandResponse {
  ok: boolean;
  lines: string[]; // preformatted monospace output
  /** Optional side-effect hints so the GUI can mirror the terminal action. */
  effect?:
    | { type: 'availability'; query: FlightSearchQuery; results: Flight[] }
    | { type: 'sell'; flightId: string; fareFamily: FareFamily }
    | { type: 'retrieve'; pnr: Pnr }
    | { type: 'none' };
}

/** Standard error envelope returned by the API on 4xx/5xx. */
export interface ApiError {
  error: string;
  details?: unknown;
}

/**
 * Route table. Both apps import these so the URL strings live in one place.
 *   GET  /api/health
 *   GET  /api/airports?q=lon
 *   GET  /api/airlines
 *   GET  /api/flights/search?origin=LHR&destination=JFK&date=2026-09-16&passengers=1
 *   GET  /api/flights/:id
 *   GET  /api/flights/:id/seatmap
 *   POST /api/bookings
 *   GET  /api/bookings/:locator
 *   POST /api/terminal
 */
export const API = {
  health: '/api/health',
  airports: '/api/airports',
  airlines: '/api/airlines',
  flightSearch: '/api/flights/search',
  flight: (id: string) => `/api/flights/${id}`,
  seatMap: (id: string) => `/api/flights/${id}/seatmap`,
  bookings: '/api/bookings',
  booking: (locator: string) => `/api/bookings/${locator}`,
  terminal: '/api/terminal',
} as const;
