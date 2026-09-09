// Time helpers for flight schedules.
//
// Flight times are stored as LOCAL wall-clock ISO strings without an offset
// (e.g. "2026-09-16T21:35:00"), because that is how airlines publish schedules
// and how agents read them. Anything that needs an absolute instant must go
// through the airport's IANA timezone.

/** Pads a number to two digits. */
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Returns the UTC offset (in minutes) of `tz` at the given instant.
 * Uses Intl so we don't need a timezone library.
 */
export function tzOffsetMinutes(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(instant).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** Converts a local wall-clock ISO string in `tz` to an absolute instant. */
export function localToInstant(localIso: string, tz: string): Date {
  // First guess: interpret the wall-clock as UTC, then correct by the zone offset.
  const naive = new Date(`${localIso}Z`);
  const offset = tzOffsetMinutes(naive, tz);
  const guess = new Date(naive.getTime() - offset * 60_000);
  // Re-check the offset at the corrected instant (handles DST edges).
  const offset2 = tzOffsetMinutes(guess, tz);
  return offset2 === offset ? guess : new Date(naive.getTime() - offset2 * 60_000);
}

/** Formats an absolute instant as a local wall-clock ISO string (no offset) in `tz`. */
export function instantToLocal(instant: Date, tz: string): string {
  const offset = tzOffsetMinutes(instant, tz);
  const shifted = new Date(instant.getTime() + offset * 60_000);
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:00`
  );
}

/**
 * Block time in minutes between a departure and an arrival.
 * Both arguments are local ISO strings as stored on the flight.
 */
export function durationMinutes(departure: string, arrival: string): number {
  const dep = new Date(departure);
  const arr = new Date(arrival);
  return Math.round((arr.getTime() - dep.getTime()) / 60_000);
}

/** Formats minutes as "13h 05m". */
export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}h ${pad(abs % 60)}m`;
}

/** Returns YYYY-MM-DD for a Date in UTC. */
export function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
