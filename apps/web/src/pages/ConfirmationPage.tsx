// PNR confirmation / retrieval page. Shows the "PNR created" banner only when arriving
// from the passenger step (router state); otherwise acts as a plain retrieval view.
import { useLocation, useNavigate, useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Armchair, CheckCircle2, Copy, Mail, Plane, Search, Users } from 'lucide-react';
import type { Pnr } from '@workbench/shared';
import { api, ApiRequestError } from '@/lib/api';
import { CABIN_LABEL, FARE_LABEL, formatLongDate, formatPrice } from '@/lib/format';
import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { ItinerarySummary } from '@/components/ItinerarySummary';
import { PnrView } from '@/components/PnrView';
import { Stepper } from '@/components/Stepper';

/** Badge tone and label for each Amadeus status code. */
const STATUS: Record<Pnr['status'], { label: string; tone: 'green' | 'amber' | 'red' }> = {
  HK: { label: 'HK · Confirmed', tone: 'green' },
  HL: { label: 'HL · Waitlisted', tone: 'amber' },
  XX: { label: 'XX · Cancelled', tone: 'red' },
};

export function ConfirmationPage() {
  const { locator = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const created = Boolean((location.state as { created?: boolean } | null)?.created);

  const pnrQ = useQuery({
    queryKey: ['pnr', locator.toUpperCase()],
    queryFn: () => api.booking(locator.toUpperCase()),
    enabled: locator.length > 0,
    retry: false,
  });

  if (pnrQ.isError) {
    const notFound = pnrQ.error instanceof ApiRequestError && pnrQ.error.status === 404;
    return (
      <Card className="flex flex-col items-center p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          {notFound ? `No PNR found for ${locator.toUpperCase()}` : 'Could not retrieve PNR'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {notFound ? 'Check the record locator and try again.' : (pnrQ.error as Error).message}
        </p>
        <Button className="mt-6" onClick={() => navigate('/bookings')}>
          <Search className="h-4 w-4" /> Retrieve another PNR
        </Button>
      </Card>
    );
  }

  const pnr = pnrQ.data;

  return (
    <div className="space-y-6">
      {created && <Stepper current={3} />}

      {/* Created banner */}
      {created && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <div className="font-semibold">PNR created — end of transaction complete</div>
            <div className="text-sm text-emerald-800">
              The booking is confirmed (HK). Quote the record locator to the traveller.
            </div>
          </div>
        </div>
      )}

      {/* Locator header */}
      <Card className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Record locator</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-4xl font-bold tracking-[0.2em] text-amadeus-700">{locator.toUpperCase()}</span>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(locator.toUpperCase())}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Copy locator"
              title="Copy locator"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          {pnr ? (
            <>
              <Badge tone={STATUS[pnr.status].tone}>{STATUS[pnr.status].label}</Badge>
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400" /> {pnr.contactEmail}
              </span>
              <span className="text-slate-400">Created {formatLongDate(pnr.createdAt)}</span>
            </>
          ) : (
            <Skeleton className="h-6 w-64" />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Itinerary */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Plane className="h-4 w-4 text-amadeus-600" /> Itinerary
            </h2>
            {pnr ? (
              <div className="divide-y divide-slate-100">
                {pnr.segments.map((seg, i) => (
                  <div key={i} className="py-2 first:pt-0 last:pb-0">
                    <ItinerarySummary flight={seg.flight} fareFamily={seg.fareFamily} cabin={seg.cabin} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
          </Card>

          {/* Passengers */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Users className="h-4 w-4 text-amadeus-600" /> Passengers
            </h2>
            {pnr ? (
              <ul className="divide-y divide-slate-100">
                {pnr.passengers.map((p, i) => {
                  const seat = pnr.segments[0]?.seats[i] ?? null;
                  return (
                    <li key={i} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      <span className="w-6 font-mono text-sm text-slate-400">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900">
                          {p.lastName.toUpperCase()}/{p.firstName.toUpperCase()} {p.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {p.type} · DOB {formatLongDate(p.dateOfBirth)}
                          {p.email ? ` · ${p.email}` : ''}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-semibold text-slate-700">
                        <Armchair className="h-3.5 w-3.5 text-slate-400" />
                        {seat ?? 'No seat'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Skeleton className="h-12 w-full" />
            )}
          </Card>

          {/* Cryptic view */}
          {pnr && <PnrView pnr={pnr} />}
        </div>

        {/* Fare breakdown */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="divide-y divide-slate-100">
            <div className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Fare breakdown</h2>
            </div>
            {pnr ? (
              <>
                <div className="space-y-2 p-5 text-sm">
                  {pnr.segments.map((seg, i) => {
                    const fare = seg.flight.fares.find((f) => f.family === seg.fareFamily && f.cabin === seg.cabin);
                    return (
                      <div key={i} className="flex justify-between text-slate-600">
                        <span>
                          {CABIN_LABEL[seg.cabin]} {FARE_LABEL[seg.fareFamily]} × {pnr.passengers.length}
                        </span>
                        <span className="font-medium text-slate-900">
                          {fare ? formatPrice(fare.price * pnr.passengers.length) : '—'}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-slate-600">
                    <span>Taxes &amp; fees</span>
                    <span className="font-medium text-slate-900">Included</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="text-2xl font-bold tracking-tight text-amadeus-700">
                      {formatPrice(pnr.totalPrice, pnr.currency)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 p-5">
                  <Button variant="secondary" className="w-full" onClick={() => navigate('/bookings')}>
                    <Search className="h-4 w-4" /> Retrieve another PNR
                  </Button>
                  <Link
                    to="/"
                    className="block text-center text-sm font-medium text-amadeus-700 hover:underline"
                  >
                    Start a new search
                  </Link>
                </div>
              </>
            ) : (
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
