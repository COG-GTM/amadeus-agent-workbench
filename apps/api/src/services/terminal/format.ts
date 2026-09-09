// Formatting helpers and lookup tables for the cryptic terminal.
//
// Everything a real Amadeus screen prints in fixed-width columns lives here
// (booking-class tables, IATA equipment codes, DDMMM dates, PNR/availability
// renderers) so `terminal.service.ts` can focus on parsing and session state.
import type { Cabin, FareFamily, Flight, Pnr } from '@workbench/shared';

/** Office / sign used in RP headers. Mirrors the agent shown in the web header. */
export const OFFICE_ID = 'LONBA0980';
export const AGENT_SIGN = 'AA/SU';

/**
 * Booking class → fare family / cabin. Real RBDs vary per carrier; this is the
 * small deterministic table the demo uses everywhere (AN display, SS, RT).
 */
export const BOOKING_CLASSES: Record<string, { family: FareFamily; cabin: Cabin }> = {
  J: { family: 'FLEX', cabin: 'BUSINESS' },
  C: { family: 'STANDARD', cabin: 'BUSINESS' },
  D: { family: 'STANDARD', cabin: 'BUSINESS' },
  Y: { family: 'FLEX', cabin: 'ECONOMY' },
  B: { family: 'STANDARD', cabin: 'ECONOMY' },
  H: { family: 'STANDARD', cabin: 'ECONOMY' },
  M: { family: 'LIGHT', cabin: 'ECONOMY' },
  K: { family: 'LIGHT', cabin: 'ECONOMY' },
};

/** Column order of the classes on an AN line (business first, like a real display). */
export const CLASS_ORDER = ['J', 'C', 'D', 'Y', 'B', 'H', 'M', 'K'] as const;

/** Reverse lookup for PNR segments: the "primary" class for a fare family + cabin. */
export function bookingClassFor(family: FareFamily, cabin: Cabin): string {
  const primary: Record<Cabin, Record<FareFamily, string>> = {
    BUSINESS: { FLEX: 'J', STANDARD: 'C', LIGHT: 'D' },
    ECONOMY: { FLEX: 'Y', STANDARD: 'B', LIGHT: 'M' },
  };
  return primary[cabin][family];
}

/** IATA equipment codes for the aircraft types in the seed data. */
const EQUIPMENT: Record<string, string> = {
  'Airbus A220-300': '223',
  'Airbus A320': '320',
  'Airbus A320neo': '32N',
  'Airbus A321': '321',
  'Airbus A321T': '32B',
  'Airbus A321neo': '32Q',
  'Airbus A330-900': '339',
  'Airbus A350-1000': '351',
  'Airbus A350-900': '359',
  'Airbus A380-800': '388',
  'Boeing 737 MAX 9': '7M9',
  'Boeing 737-800': '738',
  'Boeing 747-8': '74H',
  'Boeing 767-300ER': '76W',
  'Boeing 777-300ER': '77W',
  'Boeing 787-10': '78J',
  'Boeing 787-9': '789',
  'Embraer E175': 'E75',
};

/** Returns the 3-char IATA equipment code, falling back to the first 3 chars of the name. */
export function equipmentCode(aircraft: string): string {
  return EQUIPMENT[aircraft] ?? aircraft.replace(/[^A-Z0-9]/gi, '').slice(-3).toUpperCase();
}

/** ISO 3166 alpha-2 codes for the countries in the seed data (used in the AN header). */
const COUNTRY_CODES: Record<string, string> = {
  Finland: 'FI',
  France: 'FR',
  Germany: 'DE',
  'Hong Kong': 'HK',
  Italy: 'IT',
  Japan: 'JP',
  Netherlands: 'NL',
  Qatar: 'QA',
  Singapore: 'SG',
  Spain: 'ES',
  Switzerland: 'CH',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
};

/** Two-letter country code, defaulting to the first two letters of the name. */
export function countryCode(country: string): string {
  return COUNTRY_CODES[country] ?? country.slice(0, 2).toUpperCase();
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Parses "20SEP" → { day: 20, month: 8 } or null when malformed. */
export function parseDdMmm(text: string): { day: number; month: number } | null {
  const m = /^(\d{2})([A-Z]{3})$/.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2] ?? '');
  const day = Number(m[1]);
  if (month < 0 || day < 1 || day > 31) return null;
  return { day, month };
}

/** Formats a YYYY-MM-DD (or local ISO) string as Amadeus "20SEP". */
export function ddmmm(isoDate: string): string {
  const mm = Number(isoDate.slice(5, 7));
  const dd = isoDate.slice(8, 10);
  return `${dd}${MONTHS[mm - 1] ?? '???'}`;
}

/** Formats a YYYY-MM-DD string as "20SEP26" (two-digit year). */
export function ddmmmyy(isoDate: string): string {
  return `${ddmmm(isoDate)}${isoDate.slice(2, 4)}`;
}

/** Two-letter weekday ("SA") for a YYYY-MM-DD date, evaluated in UTC. */
export function weekday2(isoDate: string): string {
  return WEEKDAYS[new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).getUTCDay()] ?? '??';
}

/** Amadeus weekday digit (1 = Monday … 7 = Sunday) for a YYYY-MM-DD date. */
export function weekdayDigit(isoDate: string): number {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** "2026-09-20T08:25:00" → "0825". */
export function hhmm(localIso: string): string {
  return localIso.slice(11, 16).replace(':', '');
}

/** Formats block minutes as "7:55" (keeps the sign so a negative duration is visible). */
export function hmm(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

/** "BA0117" → "BA 117" (carrier, then the number right-aligned in 4 columns). */
export function flightDesignator(flightNumber: string): string {
  const carrier = flightNumber.slice(0, 2);
  const num = String(Number(flightNumber.slice(2)));
  return `${carrier}${num.padStart(4)}`;
}

/** Pads/truncates `s` to exactly `n` columns (left aligned). */
export const col = (s: string, n: number) => s.slice(0, n).padEnd(n);

/**
 * Renders the AN header, e.g.
 * `** AMADEUS AVAILABILITY - AN ** JFK NEW YORK.US            123 SA 20SEP 0000`
 */
export function availabilityHeader(destination: Flight['destination'], date: string, daysOut: number): string {
  const place = col(`${destination.code} ${destination.city.toUpperCase()}.${countryCode(destination.country)}`, 28);
  return `** AMADEUS AVAILABILITY - AN ** ${place}${String(daysOut).padStart(3)} ${weekday2(date)} ${ddmmm(date)} 0000`;
}

/**
 * Renders one AN line, e.g.
 * `1  BA 117  J9 C9 D9 Y9 B9 H9 M9 /LHR 5 JFK 4  0825  1120  E0/77W  7:55`
 * Only classes whose fare family is offered on the flight are shown; counts cap at 9.
 */
export function availabilityLine(index: number, f: Flight): string {
  const classes = CLASS_ORDER.map((cls) => {
    const { family, cabin } = BOOKING_CLASSES[cls]!;
    const fare = f.fares.find((x) => x.family === family && x.cabin === cabin);
    if (!fare) return null;
    return `${cls}${Math.min(9, fare.seatsLeft)}`;
  })
    .filter((x): x is string => x !== null)
    .join(' ');
  const terminals = `/${f.origin.code} ${terminalFor(f.origin.code)} ${f.destination.code} ${terminalFor(f.destination.code)}`;
  return (
    `${String(index).padEnd(3)}${flightDesignator(f.flightNumber)}  ${col(classes, 23)} ${terminals}  ` +
    `${hhmm(f.departure)}  ${hhmm(f.arrival)}  E${f.stops}/${equipmentCode(f.aircraft)}  ${hmm(f.durationMinutes)}`
  );
}

/** Plausible terminal numbers for the AN display (purely cosmetic). */
function terminalFor(airport: string): string {
  const t: Record<string, string> = { LHR: '5', JFK: '4', CDG: '2E', AMS: '1', FRA: '1', MUC: '2', SIN: '3', DXB: '3' };
  return t[airport] ?? '1';
}

/**
 * Renders a sold segment line, e.g.
 * `1  BA 117 Y 20SEP 1 LHRJFK DK1  0825 1120  20SEP  E  0 77W`
 * `status` is "DK" while pending in the working area and "HK" once committed.
 */
export function segmentLine(index: number, f: Flight, cls: string, status: string, pax: number, trailer: string): string {
  const date = ddmmm(f.departure);
  return (
    `${String(index).padEnd(3)}${flightDesignator(f.flightNumber)} ${cls} ${date} ${weekdayDigit(f.departure)} ` +
    `${f.origin.code}${f.destination.code} ${status}${pax}  ${hhmm(f.departure)} ${hhmm(f.arrival)}  ${ddmmm(f.arrival)}  E  ${trailer}`
  );
}

/** "1.SMITH/JOHN MR" style passenger element. */
export function nameLine(index: number, p: { lastName: string; firstName: string; title: string }): string {
  return `  ${index}.${p.lastName.toUpperCase()}/${p.firstName.toUpperCase()} ${p.title}`;
}

/** RP/… header line for RT and working-area displays. */
export function rpHeader(createdAt: string | null, locator: string | null): string {
  const d = createdAt ? new Date(createdAt) : new Date();
  const iso = d.toISOString();
  const stamp = `${ddmmmyy(iso)}/${iso.slice(11, 16).replace(':', '')}Z`;
  return `RP/${OFFICE_ID}/${OFFICE_ID}            ${AGENT_SIGN}  ${stamp}   ${locator ?? ''}`.trimEnd();
}

/**
 * Renders a committed PNR the way RT prints it:
 * header, names, segments (HK), contact elements, seat SSRs and a ticketing line.
 */
export function renderPnr(pnr: Pnr): string[] {
  const lines = [rpHeader(pnr.createdAt, pnr.locator)];
  pnr.passengers.forEach((p, i) => lines.push(nameLine(i + 1, p)));
  let n = pnr.passengers.length;
  for (const seg of pnr.segments) {
    const cls = bookingClassFor(seg.fareFamily, seg.cabin);
    lines.push(
      segmentLine(++n, seg.flight, cls, pnr.status, pnr.passengers.length, `${seg.flight.airline.code}/${pnr.locator}`),
    );
  }
  const phone = pnr.passengers.find((p) => p.phone)?.phone;
  if (phone) lines.push(`  ${++n} AP ${phone}`);
  lines.push(`  ${++n} APE ${pnr.contactEmail.toUpperCase()}`);
  lines.push(`  ${++n} TK OK${ddmmm(pnr.createdAt)}/${OFFICE_ID}`);
  pnr.segments.forEach((seg) =>
    seg.seats.forEach((seat, pi) => {
      if (!seat) return;
      lines.push(
        `  ${++n} SSR RQST ${seg.flight.airline.code} ${pnr.status}1 ${seg.flight.origin.code}${seg.flight.destination.code}/${seat},P${pi + 1}`,
      );
    }),
  );
  return lines;
}
