// Display formatting helpers shared across pages.

/** Formats a local ISO string ("2026-09-16T21:35:00") as "21:35". */
export function formatTime(localIso: string): string {
  return localIso.slice(11, 16);
}

/** Formats a local ISO string as "Wed 16 Sep". */
export function formatDate(localIso: string): string {
  const d = new Date(localIso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Formats minutes as "7h 55m". Negative values are passed through with a leading minus. */
export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, '0')}m`;
}

/** Number of calendar days between departure and arrival local dates (for the "+1" badge). */
export function dayOffset(departure: string, arrival: string): number {
  const a = new Date(departure.slice(0, 10)).getTime();
  const b = new Date(arrival.slice(0, 10)).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Formats an amount in EUR, e.g. "€489.00". */
export function formatPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
}

/** Human label for a fare family. */
export const FARE_LABEL: Record<string, string> = {
  LIGHT: 'Light',
  STANDARD: 'Standard',
  FLEX: 'Flex',
};

/** Human label for a cabin, e.g. "Economy". */
export const CABIN_LABEL: Record<string, string> = {
  ECONOMY: 'Economy',
  BUSINESS: 'Business',
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Formats a local ISO string as an Amadeus cryptic date, e.g. "16SEP". */
export function crypticDate(localIso: string): string {
  const day = localIso.slice(8, 10);
  const month = Number(localIso.slice(5, 7)) - 1;
  return `${day}${MONTHS[month] ?? '???'}`;
}

/** Formats an ISO instant as a cryptic timestamp in UTC, e.g. "16SEP26/1042Z". */
export function crypticTimestamp(isoInstant: string): string {
  const d = new Date(isoInstant);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  const year = String(d.getUTCFullYear()).slice(2);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day}${month}${year}/${hh}${mm}Z`;
}

/** ISO weekday number (Monday = 1 … Sunday = 7) for a local ISO date, as shown on cryptic segment lines. */
export function crypticWeekday(localIso: string): number {
  const dow = new Date(localIso.slice(0, 10)).getDay();
  return dow === 0 ? 7 : dow;
}

/** Splits "BA0117" into "BA 117" — the carrier code and un-padded flight number as printed in a PNR. */
export function crypticFlightNumber(flightNumber: string): string {
  const carrier = flightNumber.slice(0, 2);
  const num = flightNumber.slice(2).replace(/^0+/, '') || '0';
  return `${carrier} ${num.padStart(4, ' ')}`;
}

/** Formats a YYYY-MM-DD string as "12 Apr 1988" for passenger lists. */
export function formatLongDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
