// Seat map page: pick one seat per passenger on the chosen flight, with a sticky
// price summary. Continues to the passenger details step with seats in the URL.
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Armchair, Check } from 'lucide-react';
import type { Cabin, FareFamily, Seat } from '@workbench/shared';
import { api } from '@/lib/api';
import { CABIN_LABEL, FARE_LABEL, formatPrice } from '@/lib/format';
import { Button, Card, Skeleton } from '@/components/ui';
import { SeatGrid } from '@/components/SeatGrid';
import { ItinerarySummary } from '@/components/ItinerarySummary';
import { Stepper } from '@/components/Stepper';

/** Narrows a query-string value to a FareFamily, defaulting to STANDARD. */
function parseFare(v: string | null): FareFamily {
  return v === 'LIGHT' || v === 'FLEX' ? v : 'STANDARD';
}

/** Narrows a query-string value to a Cabin, defaulting to ECONOMY. */
function parseCabin(v: string | null): Cabin {
  return v === 'BUSINESS' ? 'BUSINESS' : 'ECONOMY';
}

export function SeatMapPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const fareFamily = parseFare(params.get('fare'));
  const cabin = parseCabin(params.get('cabin'));
  const passengers = Math.min(9, Math.max(1, Number(params.get('passengers') ?? '1') || 1));

  const flightQ = useQuery({ queryKey: ['flight', id], queryFn: () => api.flight(id), enabled: !!id });
  const seatMapQ = useQuery({ queryKey: ['seatmap', id], queryFn: () => api.seatMap(id), enabled: !!id });

  const [selected, setSelected] = useState<string[]>([]);

  // Look up seat objects (for prices) from the selected numbers.
  const seatIndex = useMemo(() => {
    const m = new Map<string, Seat>();
    seatMapQ.data?.rows.forEach((row) => row.forEach((s) => m.set(s.number, s)));
    return m;
  }, [seatMapQ.data]);

  const fare = flightQ.data?.fares.find((f) => f.family === fareFamily && f.cabin === cabin) ??
    flightQ.data?.fares.find((f) => f.family === fareFamily);

  const seatTotal = selected.reduce((sum, n) => sum + (seatIndex.get(n)?.price ?? 0), 0);
  const fareTotal = (fare?.price ?? 0) * passengers;
  const total = fareTotal + seatTotal;
  const complete = selected.length === passengers;

  /**
   * Toggles a seat. Once every passenger has a seat, picking another swaps out the
   * earliest selection so the agent never gets stuck. Note: taken seats are NOT
   * rejected here — the seat map is intentionally permissive.
   */
  function toggle(seat: Seat) {
    setSelected((prev) => {
      if (prev.includes(seat.number)) return prev.filter((n) => n !== seat.number);
      const next = prev.length >= passengers ? prev.slice(1) : prev;
      return [...next, seat.number];
    });
  }

  function continueToPassengers() {
    const sp = new URLSearchParams({
      fare: fareFamily,
      cabin,
      passengers: String(passengers),
      seats: selected.join(','),
    });
    navigate(`/flights/${id}/passengers?${sp}`);
  }

  const error = flightQ.error ?? seatMapQ.error;
  if (error) {
    return (
      <Card className="flex flex-col items-center p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Could not load this flight</h2>
        <p className="mt-1 text-sm text-slate-500">{(error as Error).message}</p>
        <Button className="mt-6" variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back to results
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper current={1} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Seat map */}
        <Card className="p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
                <Armchair className="h-5 w-5 text-amadeus-600" /> Choose seats
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {seatMapQ.data ? (
                  <>
                    {seatMapQ.data.aircraft} · {seatMapQ.data.layout} layout · select {passengers}{' '}
                    {passengers === 1 ? 'seat' : 'seats'}
                  </>
                ) : (
                  'Loading seat map…'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amadeus-700 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to results
            </button>
          </div>

          {seatMapQ.isLoading && (
            <div className="mx-auto w-fit space-y-2">
              {Array.from({ length: 14 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-[420px]" />
              ))}
            </div>
          )}
          {seatMapQ.data && <SeatGrid seatMap={seatMapQ.data} selected={selected} onToggle={toggle} />}
        </Card>

        {/* Sticky summary */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="divide-y divide-slate-100">
            <div className="p-5">
              {flightQ.data ? (
                <ItinerarySummary flight={flightQ.data} fareFamily={fareFamily} cabin={cabin} />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Selected seats</div>
              {selected.length === 0 ? (
                <p className="text-sm text-slate-400">No seats chosen yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {selected.map((n, i) => {
                    const seat = seatIndex.get(n);
                    return (
                      <li
                        key={n}
                        className="inline-flex items-center gap-1.5 rounded-md bg-sunrise-400/20 px-2 py-1 font-mono text-sm font-semibold text-amadeus-900 ring-1 ring-sunrise-400/60"
                      >
                        <span className="text-[10px] font-normal text-slate-500">P{i + 1}</span>
                        {n}
                        {seat?.price ? <span className="text-xs font-normal text-slate-500">+{formatPrice(seat.price)}</span> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-2 text-xs text-slate-400">
                {complete ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <Check className="h-3 w-3" /> All passengers seated
                  </span>
                ) : (
                  `${passengers - selected.length} more to choose`
                )}
              </p>
            </div>

            <div className="space-y-2 p-5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>
                  {CABIN_LABEL[cabin]} {FARE_LABEL[fareFamily]} × {passengers}
                </span>
                <span className="font-medium text-slate-900">{fare ? formatPrice(fareTotal) : '—'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Seat selection</span>
                <span className="font-medium text-slate-900">{formatPrice(seatTotal)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="text-2xl font-bold tracking-tight text-amadeus-700">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="p-5">
              <Button size="lg" className="w-full" disabled={!complete} onClick={continueToPassengers}>
                Continue to passengers <ArrowRight className="h-4 w-4" />
              </Button>
              {!complete && (
                <p className="mt-2 text-center text-xs text-slate-400">Select a seat for every passenger to continue.</p>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
