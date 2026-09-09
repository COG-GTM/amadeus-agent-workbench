// Flight results page: reads the search from the URL, calls the API and lets the
// agent filter/sort client-side before picking a fare family on a flight.
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CalendarDays, PencilLine, SearchX, SlidersHorizontal, Users } from 'lucide-react';
import type { Cabin, Fare, Flight } from '@workbench/shared';
import { api } from '@/lib/api';
import { CABIN_LABEL, formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button, Card, Label, Select, Skeleton } from '@/components/ui';
import { AirlineLogo, FlightCard } from '@/components/FlightCard';

type SortKey = 'price' | 'departure' | 'duration';

/** Cheapest fare in a cabin, used for price sorting. Infinity when the cabin isn't sold. */
function minPrice(flight: Flight, cabin: Cabin): number {
  const prices = flight.fares.filter((f) => f.cabin === cabin).map((f) => f.price);
  return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
}

export function ResultsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Search parameters from the URL. Missing values are reported as an error state below.
  const origin = params.get('origin') ?? '';
  const destination = params.get('destination') ?? '';
  const date = params.get('date') ?? '';
  const passengers = Math.min(9, Math.max(1, Number(params.get('passengers') ?? '1') || 1));
  const cabinParam = params.get('cabin');
  const valid = /^[A-Z]{3}$/.test(origin) && /^[A-Z]{3}$/.test(destination) && /^\d{4}-\d{2}-\d{2}$/.test(date);

  // Client-side filter/sort state. Cabin defaults to the searched cabin, else Economy.
  const [cabin, setCabin] = useState<Cabin>(cabinParam === 'BUSINESS' ? 'BUSINESS' : 'ECONOMY');
  const [sort, setSort] = useState<SortKey>('price');
  const [hiddenAirlines, setHiddenAirlines] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['search', origin, destination, date, passengers, cabinParam],
    queryFn: () =>
      api.searchFlights({
        origin,
        destination,
        date,
        passengers,
        cabin: cabinParam === 'ECONOMY' || cabinParam === 'BUSINESS' ? cabinParam : undefined,
      }),
    enabled: valid,
  });

  const results = useMemo(() => query.data?.results ?? [], [query.data]);

  // Airlines present in the raw results drive the checkbox list (with counts).
  const airlines = useMemo(() => {
    const map = new Map<string, { code: string; name: string; logo: string; count: number }>();
    for (const f of results) {
      const entry = map.get(f.airline.code) ?? { ...f.airline, count: 0 };
      entry.count += 1;
      map.set(f.airline.code, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  // Apply airline + cabin filters, then sort.
  const visible = useMemo(() => {
    const filtered = results.filter(
      (f) => !hiddenAirlines.has(f.airline.code) && f.fares.some((fare) => fare.cabin === cabin),
    );
    const sorted = [...filtered];
    if (sort === 'price') sorted.sort((a, b) => minPrice(a, cabin) - minPrice(b, cabin));
    if (sort === 'departure') sorted.sort((a, b) => a.departure.localeCompare(b.departure));
    if (sort === 'duration') sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
    return sorted;
  }, [results, hiddenAirlines, cabin, sort]);

  function toggleAirline(code: string) {
    setHiddenAirlines((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  /** Picking a fare moves to the seat map, carrying fare/cabin/pax in the query string. */
  function selectFare(flight: Flight, fare: Fare) {
    const sp = new URLSearchParams({ fare: fare.family, cabin: fare.cabin, passengers: String(passengers) });
    navigate(`/flights/${flight.id}/seats?${sp}`);
  }

  if (!valid) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Incomplete search"
        body="Origin, destination and a departure date are required to look up availability."
        action={
          <Button onClick={() => navigate('/')}>
            <PencilLine className="h-4 w-4" /> Back to search
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900">
            <span>{origin}</span>
            <ArrowRight className="h-5 w-5 text-amadeus-500" />
            <span>{destination}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {formatDate(date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400" />
              {passengers} {passengers === 1 ? 'passenger' : 'passengers'}
            </span>
            <span className="hidden text-slate-400 sm:inline">·</span>
            <span className="hidden sm:inline">{cabinParam ? CABIN_LABEL[cabinParam] : 'Any cabin'}</span>
          </div>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amadeus-700 hover:text-amadeus-900 hover:underline"
        >
          <PencilLine className="h-4 w-4" /> Edit search
        </Link>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* Filter rail */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <SlidersHorizontal className="h-4 w-4 text-amadeus-600" /> Filters
            </div>

            <div className="space-y-5">
              <div>
                <Label htmlFor="sort">Sort by</Label>
                <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="price">Lowest price</option>
                  <option value="departure">Departure time</option>
                  <option value="duration">Shortest duration</option>
                </Select>
              </div>

              <div>
                <Label>Cabin</Label>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
                  {(['ECONOMY', 'BUSINESS'] as Cabin[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCabin(c)}
                      className={cn(
                        'rounded px-2 py-1.5 text-xs font-semibold transition',
                        cabin === c ? 'bg-white text-amadeus-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      {CABIN_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Airlines</Label>
                {query.isLoading ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-6" />
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {airlines.map((a) => (
                      <li key={a.code}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={!hiddenAirlines.has(a.code)}
                            onChange={() => toggleAirline(a.code)}
                            className="h-4 w-4 rounded border-slate-300 accent-amadeus-600"
                          />
                          <AirlineLogo code={a.code} logo={a.logo} className="h-6 w-6" />
                          <span className="flex-1 truncate text-slate-700">{a.name}</span>
                          <span className="text-xs text-slate-400">{a.count}</span>
                        </label>
                      </li>
                    ))}
                    {airlines.length === 0 && <li className="text-xs text-slate-400">No carriers</li>}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        </aside>

        {/* Results list */}
        <section className="space-y-4">
          {query.isLoading && (
            <>
              {[0, 1, 2].map((i) => (
                <Card key={i} className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1fr_340px]">
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                </Card>
              ))}
            </>
          )}

          {query.isError && (
            <EmptyState
              icon={AlertTriangle}
              title="Availability request failed"
              body={(query.error as Error).message}
              action={
                <Button variant="secondary" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              }
            />
          )}

          {query.isSuccess && visible.length === 0 && (
            <EmptyState
              icon={SearchX}
              title={results.length === 0 ? 'No flights found' : 'No flights match your filters'}
              body={
                results.length === 0
                  ? `Nothing scheduled ${origin} → ${destination} on ${formatDate(date)}. Try another date or route.`
                  : 'Clear a filter or switch cabin to see more options.'
              }
              action={
                results.length === 0 ? (
                  <Button onClick={() => navigate('/')}>
                    <PencilLine className="h-4 w-4" /> Edit search
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setHiddenAirlines(new Set())}>
                    Clear filters
                  </Button>
                )
              }
            />
          )}

          {query.isSuccess && visible.length > 0 && (
            <>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{visible.length}</span> of {results.length} flights ·
                prices per passenger in EUR
              </p>
              {visible.map((flight) => (
                <FlightCard key={flight.id} flight={flight} cabin={cabin} onSelectFare={selectFare} />
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** Centered message card used for empty, error and invalid-query states. */
function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof SearchX;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amadeus-50 text-amadeus-600">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
