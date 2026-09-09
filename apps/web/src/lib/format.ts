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
