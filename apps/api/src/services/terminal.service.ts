// Parser/executor for cryptic terminal commands (Amadeus Selling Platform style).
//
// Supported entries: HE, AN (availability), SS (sell), NM (name), AP/APE
// (contact), ET/ER (end transaction), RT (retrieve), IG/IR (ignore).
// State is held per client session in an in-memory Map so `SS` can refer to a
// line of the last `AN`, and `ET` can commit the names/segment typed so far.
// Rendering helpers and lookup tables live in ./terminal/format.ts.
import type { FareFamily, Cabin, FlightSearchQuery, Passenger, TerminalCommandResponse } from '@workbench/shared';
import { getDb } from '../db/connection.ts';
import { isoDate } from '../lib/time.ts';
import { getFlight, searchFlights } from './flights.service.ts';
import { BookingError, createBooking, getPnr } from './pnr.service.ts';
import {
  BOOKING_CLASSES,
  availabilityHeader,
  availabilityLine,
  equipmentCode,
  nameLine,
  parseDdMmm,
  renderPnr,
  rpHeader,
  segmentLine,
} from './terminal/format.ts';

/** Segment sold with `SS` that has not yet been committed with `ET`. */
export interface PendingSegment {
  flightId: string;
  bookingClass: string;
  fareFamily: FareFamily;
  cabin: Cabin;
  passengers: number;
}

/** Per-session state so `SS` can refer to a line of the last `AN` response. */
export interface TerminalSession {
  lastAvailability: string[]; // flight ids in display order
  lastQuery: FlightSearchQuery | null; // query behind `lastAvailability`
  currentPnr: string | null; // locator of the last created/retrieved PNR
  pendingSegment: PendingSegment | null; // SS awaiting ET
  passengers: Passenger[]; // NM elements awaiting ET
  phone: string | null; // AP element
  email: string | null; // APE element
}

const sessions = new Map<string, TerminalSession>();

/** Fresh, empty session state (also used by IG to wipe the working area). */
function emptySession(): TerminalSession {
  return {
    lastAvailability: [],
    lastQuery: null,
    currentPnr: null,
    pendingSegment: null,
    passengers: [],
    phone: null,
    email: null,
  };
}

/** Returns (creating if needed) the state for a client session. */
export function getSession(sessionId: string): TerminalSession {
  let s = sessions.get(sessionId);
  if (!s) {
    s = emptySession();
    sessions.set(sessionId, s);
  }
  return s;
}

/** Drops all session state. Exposed for tests. */
export function resetSessions() {
  sessions.clear();
}

/** Schedule window seeded by the DB; AN dates beyond this have no flights. */
const SCHEDULE_DAYS = 45;

/** Placeholder DOB for passengers created through NM (the cryptic entry has no DOB). */
const DEFAULT_DOB = '1980-01-01';

const HELP = [
  'AMADEUS SELLING PLATFORM — COMMAND HELP',
  '',
  'AN20SEPLHRJFK        AVAILABILITY 20SEP LHR-JFK',
  'AN20SEPLHRJFK/AAF    ... AIR FRANCE ONLY',
  'SS1Y2                SELL 1 SEAT, CLASS Y, LINE 2',
  'NM1SMITH/JOHN MR     ADD PASSENGER NAME',
  'AP LON 020 7946 0000 ADD PHONE CONTACT',
  'APE-AGENT@EXAMPLE.COM ADD EMAIL CONTACT',
  'ET                   END TRANSACTION (CREATE PNR)',
  'ER                   END AND REDISPLAY PNR',
  'RT                   RETRIEVE CURRENT PNR',
  'RTX7K2PQ             RETRIEVE PNR X7K2PQ',
  'IG                   IGNORE WORKING PNR',
  'IR                   IGNORE AND REDISPLAY',
  'HE                   THIS HELP',
  '',
  'CLASSES  J/C/D BUSINESS   Y/B/H/M/K ECONOMY',
];

/** Shorthand for an error response: output is uppercase like the host would print it. */
function fail(...lines: string[]): TerminalCommandResponse {
  return { ok: false, lines, effect: { type: 'none' } };
}

/** Shorthand for a successful response with no GUI side effect. */
function say(...lines: string[]): TerminalCommandResponse {
  return { ok: true, lines, effect: { type: 'none' } };
}

/** Executes one command and returns preformatted output lines. */
export function runCommand(raw: string, sessionId: string): TerminalCommandResponse {
  const session = getSession(sessionId);
  const cmd = raw.trim().toUpperCase().replace(/\s+/g, ' ');

  if (cmd === 'HE' || cmd.startsWith('HE ')) return say(...HELP);
  if (cmd.startsWith('AN')) return availability(cmd, session);
  if (cmd.startsWith('SS')) return sell(cmd, session);
  if (cmd.startsWith('NM')) return addName(cmd, session);
  if (cmd.startsWith('APE')) return addEmail(cmd, session);
  if (cmd.startsWith('AP')) return addPhone(cmd, session);
  if (cmd === 'ET' || cmd === 'ER') return endTransaction(cmd, session);
  if (cmd.startsWith('RT')) return retrieve(cmd.slice(2).trim(), session);
  if (cmd === 'IG') return ignore(session);
  if (cmd === 'IR') return ignoreAndRetrieve(session);

  return fail('INVALID ENTRY — TYPE HE FOR HELP');
}

// ---------------------------------------------------------------------------
// AN — availability
// ---------------------------------------------------------------------------

/**
 * Resolves DDMMM to a YYYY-MM-DD within the schedule window. Dates already past
 * this year roll to next year; anything outside the seeded window is rejected.
 */
export function resolveDate(ddmmm: string, today = new Date()): string | null {
  const parsed = parseDdMmm(ddmmm);
  if (!parsed) return null;
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  let candidate = Date.UTC(today.getUTCFullYear(), parsed.month, parsed.day);
  if (candidate < todayUtc) candidate = Date.UTC(today.getUTCFullYear() + 1, parsed.month, parsed.day);
  // Reject impossible dates such as 31FEB (Date.UTC would silently roll them over).
  if (new Date(candidate).getUTCDate() !== parsed.day) return null;
  if (candidate > todayUtc + SCHEDULE_DAYS * 86_400_000) return null;
  return isoDate(new Date(candidate));
}

/** True when the airport code exists in the reference data. */
function airportExists(code: string): boolean {
  return Boolean(getDb().prepare('SELECT 1 FROM airports WHERE code = ?').get(code));
}

/** AN<DDMMM><ORG><DST>[/A<airline>] */
function availability(cmd: string, session: TerminalSession): TerminalCommandResponse {
  const body = cmd.slice(2).trim();
  if (!body) return fail('NEED DATE');
  const m = /^(\d{2}[A-Z]{3})([A-Z]{3})([A-Z]{3})(?:\/A([A-Z0-9]{2}))?$/.exec(body);
  if (!m) {
    if (!/^\d{2}[A-Z]{3}/.test(body)) return fail('NEED DATE');
    return fail('INVALID ENTRY — CHECK FORMAT AN20SEPLHRJFK');
  }
  const ddmmm = m[1] ?? '';
  const origin = m[2] ?? '';
  const destination = m[3] ?? '';
  const airline = m[4];
  const date = resolveDate(ddmmm);
  if (!date) return fail('CHECK DATE');
  if (!airportExists(origin) || !airportExists(destination)) return fail('CHECK CITY CODE');
  if (origin === destination) return fail('CHECK CITY CODE — SAME ORIGIN AND DESTINATION');

  const query: FlightSearchQuery = { origin, destination, date, passengers: 1 };
  let results = searchFlights(query);
  if (airline) results = results.filter((f) => f.airline.code === airline);
  if (results.length === 0) return fail('NO DIRECT FLIGHTS — CHECK ROUTE OR DATE');

  session.lastAvailability = results.map((f) => f.id);
  session.lastQuery = query;

  const daysOut = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${isoDate(new Date())}T00:00:00Z`)) / 86_400_000);
  const lines = [availabilityHeader(results[0]!.destination, date, daysOut)];
  results.forEach((f, i) => lines.push(availabilityLine(i + 1, f)));
  return { ok: true, lines, effect: { type: 'availability', query, results } };
}

// ---------------------------------------------------------------------------
// SS — sell from the last availability
// ---------------------------------------------------------------------------

/** SS<n><class><line> */
function sell(cmd: string, session: TerminalSession): TerminalCommandResponse {
  const m = /^SS(\d)([A-Z])(\d{1,2})$/.exec(cmd);
  if (!m) return fail('INVALID ENTRY — CHECK FORMAT SS1Y2');
  const pax = Number(m[1]);
  const cls = m[2] ?? '';
  const line = Number(m[3]);
  if (pax < 1) return fail('CHECK NUMBER OF SEATS');
  if (session.lastAvailability.length === 0) return fail('NO ITINERARY');
  const flightId = session.lastAvailability[line - 1];
  if (!flightId) return fail('CHECK LINE NUMBER');
  const rbd = BOOKING_CLASSES[cls];
  if (!rbd) return fail('CHECK CLASS');
  const flight = getFlight(flightId);
  if (!flight) return fail('CHECK LINE NUMBER');
  const fare = flight.fares.find((f) => f.family === rbd.family && f.cabin === rbd.cabin);
  if (!fare) return fail(`CLASS ${cls} NOT OFFERED ON THIS FLIGHT`);
  if (fare.seatsLeft < pax) return fail(`CLASS ${cls} CLOSED — ${fare.seatsLeft} SEAT(S) LEFT`);

  session.pendingSegment = { flightId, bookingClass: cls, fareFamily: rbd.family, cabin: rbd.cabin, passengers: pax };
  const trailer = `0 ${equipmentCode(flight.aircraft)}`;
  return {
    ok: true,
    lines: [segmentLine(session.passengers.length + 1, flight, cls, 'DK', pax, trailer)],
    effect: { type: 'sell', flightId, fareFamily: rbd.family },
  };
}

// ---------------------------------------------------------------------------
// NM / AP / APE — passenger and contact elements
// ---------------------------------------------------------------------------

const TITLES = new Set<Passenger['title']>(['MR', 'MRS', 'MS', 'DR']);

/** NM1SMITH/JOHN MR (the leading count is optional and ignored beyond 1). */
function addName(cmd: string, session: TerminalSession): TerminalCommandResponse {
  const m = /^NM(\d)?([A-Z][A-Z' -]*)\/([A-Z][A-Z' -]*?)(?: (MR|MRS|MS|DR))?$/.exec(cmd);
  if (!m) return fail('INVALID ENTRY — CHECK FORMAT NM1SMITH/JOHN MR');
  const count = m[1] ? Number(m[1]) : 1;
  if (count < 1) return fail('CHECK NUMBER OF NAMES');
  const lastName = (m[2] ?? '').trim();
  const firstName = (m[3] ?? '').trim();
  const title = (m[4] as Passenger['title'] | undefined) ?? 'MR';
  if (!TITLES.has(title)) return fail('CHECK TITLE');
  // NM2SMITH/JOHN MR is accepted as "two identical names" for simplicity.
  for (let i = 0; i < count; i++) {
    session.passengers.push({ type: 'ADT', title, firstName, lastName, dateOfBirth: DEFAULT_DOB });
  }
  return say(...renderWorkingArea(session));
}

/** AP LON 020 7946 0000 — free-text phone contact. */
function addPhone(cmd: string, session: TerminalSession): TerminalCommandResponse {
  const text = cmd.slice(2).trim();
  if (!text) return fail('NEED PHONE NUMBER');
  session.phone = text;
  return say(...renderWorkingArea(session));
}

/** APE-agent@example.com — email contact used as the PNR contact address. */
function addEmail(cmd: string, session: TerminalSession): TerminalCommandResponse {
  const text = cmd.slice(3).replace(/^-/, '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return fail('CHECK EMAIL ADDRESS');
  session.email = text.toLowerCase();
  return say(...renderWorkingArea(session));
}

/** Renders the uncommitted PNR ("working area") after NM/AP entries, like Amadeus echoes it. */
function renderWorkingArea(session: TerminalSession): string[] {
  const lines = [rpHeader(null, null)];
  session.passengers.forEach((p, i) => lines.push(nameLine(i + 1, p)));
  let n = session.passengers.length;
  if (session.pendingSegment) {
    const flight = getFlight(session.pendingSegment.flightId);
    if (flight) {
      const seg = session.pendingSegment;
      lines.push(segmentLine(++n, flight, seg.bookingClass, 'DK', seg.passengers, `0 ${equipmentCode(flight.aircraft)}`));
    }
  }
  if (session.phone) lines.push(`  ${++n} AP ${session.phone}`);
  if (session.email) lines.push(`  ${++n} APE ${session.email.toUpperCase()}`);
  if (lines.length === 1) lines.push('  NO ELEMENTS IN WORKING AREA');
  return lines;
}

// ---------------------------------------------------------------------------
// ET / ER — commit the working area into a PNR
// ---------------------------------------------------------------------------

/** ET commits; ER commits and redisplays the new PNR. */
function endTransaction(cmd: string, session: TerminalSession): TerminalCommandResponse {
  if (!session.pendingSegment) return fail('NO ITINERARY');
  if (session.passengers.length === 0) return fail('NEED NAME');
  const seg = session.pendingSegment;
  if (session.passengers.length !== seg.passengers) {
    return fail(`CHECK NUMBER OF NAMES — ${seg.passengers} SEAT(S) SOLD, ${session.passengers.length} NAME(S)`);
  }

  const lead = session.passengers[0]!;
  const contactEmail = session.email ?? `${lead.firstName}.${lead.lastName}@example.com`.toLowerCase();
  // Contact elements travel on the lead passenger so RT can print AP/APE lines later.
  const passengers = session.passengers.map((p, i) =>
    i === 0 ? { ...p, email: contactEmail, phone: session.phone ?? undefined } : p,
  );

  try {
    const pnr = createBooking({
      flightId: seg.flightId,
      fareFamily: seg.fareFamily,
      passengers,
      seats: passengers.map(() => null),
      contactEmail,
    });
    // The working area is now committed; keep the availability so the agent can keep selling.
    session.pendingSegment = null;
    session.passengers = [];
    session.phone = null;
    session.email = null;
    session.currentPnr = pnr.locator;
    const lines = [`END OF TRANSACTION COMPLETE - ${pnr.locator}`];
    if (cmd === 'ER') lines.push('', ...renderPnr(pnr));
    return { ok: true, lines, effect: { type: 'retrieve', pnr } };
  } catch (e) {
    if (e instanceof BookingError) return fail(e.message.toUpperCase());
    throw e;
  }
}

// ---------------------------------------------------------------------------
// RT / IG / IR
// ---------------------------------------------------------------------------

/** RT (current) or RT<LOCATOR>. With no locator and an uncommitted PNR, shows the working area. */
function retrieve(locator: string, session: TerminalSession): TerminalCommandResponse {
  if (!locator) {
    if (!session.currentPnr) {
      const hasWork = session.passengers.length > 0 || session.pendingSegment || session.phone || session.email;
      return hasWork ? say(...renderWorkingArea(session)) : fail('NO PNR IN AAA — ENTER RT<LOCATOR>');
    }
    locator = session.currentPnr;
  }
  if (!/^[A-Z0-9]{6}$/.test(locator)) return fail('CHECK RECORD LOCATOR');
  const pnr = getPnr(locator);
  if (!pnr) return fail('NO MATCH FOR RECORD LOCATOR');
  session.currentPnr = pnr.locator;
  return { ok: true, lines: renderPnr(pnr), effect: { type: 'retrieve', pnr } };
}

/** IG — discard the working area and forget the current PNR / availability. */
function ignore(session: TerminalSession): TerminalCommandResponse {
  Object.assign(session, emptySession());
  return say('IGNORED');
}

/** IR — discard the working area but redisplay the current PNR (if any). */
function ignoreAndRetrieve(session: TerminalSession): TerminalCommandResponse {
  const current = session.currentPnr;
  Object.assign(session, emptySession(), { currentPnr: current });
  if (!current) return say('IGNORED');
  const res = retrieve(current, session);
  return { ...res, lines: ['IGNORED', '', ...res.lines] };
}
