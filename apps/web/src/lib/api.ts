// Typed fetch wrappers for the workbench API. All URLs come from the shared
// `API` route table so the web app and server can't drift apart.
import {
  API,
  type Airline,
  type Airport,
  type CreateBookingRequest,
  type Flight,
  type FlightSearchQuery,
  type FlightSearchResponse,
  type Pnr,
  type SeatMap,
  type TerminalCommandRequest,
  type TerminalCommandResponse,
} from '@workbench/shared';

/** Thrown for non-2xx responses; carries the server's error message. */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Performs a request and parses JSON, converting error envelopes into exceptions. */
async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    throw new ApiRequestError(res.status, body.error ?? res.statusText, body.details);
  }
  return res.json() as Promise<T>;
}

/** Serialises a plain object into a query string, skipping undefined values. */
function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v));
  return sp.toString();
}

export const api = {
  airports: (q: string) => http<Airport[]>(`${API.airports}?${qs({ q })}`),
  airlines: () => http<Airline[]>(API.airlines),
  searchFlights: (q: FlightSearchQuery) => http<FlightSearchResponse>(`${API.flightSearch}?${qs({ ...q })}`),
  flight: (id: string) => http<Flight>(API.flight(id)),
  seatMap: (id: string) => http<SeatMap>(API.seatMap(id)),
  createBooking: (body: CreateBookingRequest) =>
    http<Pnr>(API.bookings, { method: 'POST', body: JSON.stringify(body) }),
  booking: (locator: string) => http<Pnr>(API.booking(locator)),
  terminal: (body: TerminalCommandRequest) =>
    http<TerminalCommandResponse>(API.terminal, { method: 'POST', body: JSON.stringify(body) }),
};
