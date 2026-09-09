// Passenger details page: one form block per traveller, lightweight validation,
// itinerary + price summary, and the "Create PNR" call that lands on the confirmation.
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Loader2, Ticket, UserRound } from 'lucide-react';
import type { Cabin, CreateBookingRequest, FareFamily, Passenger } from '@workbench/shared';
import { api, ApiRequestError } from '@/lib/api';
import { CABIN_LABEL, FARE_LABEL, formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button, Card, Input, Label, Select, Skeleton } from '@/components/ui';
import { ItinerarySummary } from '@/components/ItinerarySummary';
import { Stepper } from '@/components/Stepper';

/** Editable form state for one passenger; all strings so inputs stay controlled. */
interface PaxForm {
  title: Passenger['title'];
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  email: string;
  phone: string;
}

type PaxErrors = Partial<Record<keyof PaxForm, string>>;

/** Short list of nationalities for the demo; free text would work too but a select keeps data tidy. */
const NATIONALITIES = ['GB', 'FR', 'DE', 'NL', 'ES', 'IT', 'CH', 'FI', 'IE', 'US', 'CA', 'AE', 'QA', 'SG', 'HK', 'JP', 'AU'];

const emptyPax = (): PaxForm => ({
  title: 'MR',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  nationality: 'GB',
  email: '',
  phone: '',
});

/** Client-side validation. Only the lead passenger (index 0) needs contact details. */
function validate(p: PaxForm, isLead: boolean): PaxErrors {
  const e: PaxErrors = {};
  if (!p.firstName.trim()) e.firstName = 'Required';
  else if (!/^[A-Za-z' -]+$/.test(p.firstName)) e.firstName = 'Letters only (as on passport)';
  if (!p.lastName.trim()) e.lastName = 'Required';
  else if (!/^[A-Za-z' -]+$/.test(p.lastName)) e.lastName = 'Letters only (as on passport)';
  if (!p.dateOfBirth) e.dateOfBirth = 'Required';
  else if (new Date(p.dateOfBirth) > new Date()) e.dateOfBirth = 'Must be in the past';
  if (isLead) {
    if (!p.email.trim()) e.email = 'Required for the lead passenger';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) e.email = 'Enter a valid email';
    if (p.phone && !/^[+\d][\d\s()-]{5,}$/.test(p.phone)) e.phone = 'Enter a valid phone number';
  }
  return e;
}

/** Derives the Amadeus passenger type code from the date of birth. */
function paxType(dob: string, departure: string): Passenger['type'] {
  const years = (new Date(departure).getTime() - new Date(dob).getTime()) / (365.25 * 86_400_000);
  if (years < 2) return 'INF';
  if (years < 12) return 'CHD';
  return 'ADT';
}

export function PassengersPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const fareFamily = (params.get('fare') as FareFamily | null) ?? 'STANDARD';
  const cabin: Cabin = params.get('cabin') === 'BUSINESS' ? 'BUSINESS' : 'ECONOMY';
  const passengers = Math.min(9, Math.max(1, Number(params.get('passengers') ?? '1') || 1));
  const seats = useMemo(() => {
    const raw = (params.get('seats') ?? '').split(',').filter(Boolean);
    return Array.from({ length: passengers }, (_, i) => raw[i] ?? null);
  }, [params, passengers]);

  const flightQ = useQuery({ queryKey: ['flight', id], queryFn: () => api.flight(id), enabled: !!id });
  const seatMapQ = useQuery({ queryKey: ['seatmap', id], queryFn: () => api.seatMap(id), enabled: !!id });

  const [forms, setForms] = useState<PaxForm[]>(() => Array.from({ length: passengers }, emptyPax));
  const [errors, setErrors] = useState<PaxErrors[]>(() => Array.from({ length: passengers }, () => ({})));

  const fare = flightQ.data?.fares.find((f) => f.family === fareFamily && f.cabin === cabin) ??
    flightQ.data?.fares.find((f) => f.family === fareFamily);
  const seatTotal = seats.reduce((sum, n) => {
    const seat = seatMapQ.data?.rows.flat().find((s) => s.number === n);
    return sum + (seat?.price ?? 0);
  }, 0);
  const fareTotal = (fare?.price ?? 0) * passengers;

  const create = useMutation({
    mutationFn: (body: CreateBookingRequest) => api.createBooking(body),
    onSuccess: (pnr) => navigate(`/bookings/${pnr.locator}`, { state: { created: true } }),
  });

  function update(i: number, patch: Partial<PaxForm>) {
    setForms((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    // Clear the field error as soon as the agent edits it.
    setErrors((prev) =>
      prev.map((e, idx) => {
        if (idx !== i) return e;
        const next = { ...e };
        for (const k of Object.keys(patch) as (keyof PaxForm)[]) delete next[k];
        return next;
      }),
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!flightQ.data) return;
    const nextErrors = forms.map((p, i) => validate(p, i === 0));
    setErrors(nextErrors);
    if (nextErrors.some((err) => Object.keys(err).length > 0)) return;

    const departure = flightQ.data.departure;
    const body: CreateBookingRequest = {
      flightId: id,
      fareFamily,
      passengers: forms.map((p, i) => ({
        type: paxType(p.dateOfBirth, departure),
        title: p.title,
        firstName: p.firstName.trim(),
        lastName: p.lastName.trim(),
        dateOfBirth: p.dateOfBirth,
        email: i === 0 ? p.email.trim() : undefined,
        phone: i === 0 && p.phone.trim() ? p.phone.trim() : undefined,
      })),
      seats,
      contactEmail: forms[0]!.email.trim(),
    };
    create.mutate(body);
  }

  const apiError = create.error
    ? create.error instanceof ApiRequestError
      ? create.error.message
      : 'Unexpected error creating the PNR'
    : null;

  return (
    <div className="space-y-6">
      <Stepper current={2} />

      <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]" noValidate>
        {/* Passenger forms */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
                <UserRound className="h-5 w-5 text-amadeus-600" /> Passenger details
              </h1>
              <p className="mt-1 text-sm text-slate-500">Names exactly as they appear on the travel document.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amadeus-700 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to seats
            </button>
          </div>

          {forms.map((p, i) => {
            const err = errors[i] ?? {};
            const isLead = i === 0;
            return (
              <Card key={i} className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Passenger {i + 1}
                    {isLead && <span className="ml-2 rounded bg-amadeus-50 px-1.5 py-0.5 text-xs font-medium text-amadeus-700">Lead</span>}
                  </h2>
                  {seats[i] && (
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      Seat <span className="text-amadeus-700">{seats[i]}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <Field className="md:col-span-2" label="Title" htmlFor={`title-${i}`}>
                    <Select id={`title-${i}`} value={p.title} onChange={(e) => update(i, { title: e.target.value as PaxForm['title'] })}>
                      <option value="MR">Mr</option>
                      <option value="MRS">Mrs</option>
                      <option value="MS">Ms</option>
                      <option value="DR">Dr</option>
                    </Select>
                  </Field>
                  <Field className="md:col-span-5" label="First name" htmlFor={`first-${i}`} error={err.firstName}>
                    <Input
                      id={`first-${i}`}
                      value={p.firstName}
                      onChange={(e) => update(i, { firstName: e.target.value })}
                      placeholder="John"
                      autoComplete="given-name"
                      aria-invalid={!!err.firstName}
                      className={cn(err.firstName && 'border-red-400 focus:ring-red-200')}
                    />
                  </Field>
                  <Field className="md:col-span-5" label="Last name" htmlFor={`last-${i}`} error={err.lastName}>
                    <Input
                      id={`last-${i}`}
                      value={p.lastName}
                      onChange={(e) => update(i, { lastName: e.target.value })}
                      placeholder="Smith"
                      autoComplete="family-name"
                      aria-invalid={!!err.lastName}
                      className={cn(err.lastName && 'border-red-400 focus:ring-red-200')}
                    />
                  </Field>
                  <Field className="md:col-span-4" label="Date of birth" htmlFor={`dob-${i}`} error={err.dateOfBirth}>
                    <Input
                      id={`dob-${i}`}
                      type="date"
                      value={p.dateOfBirth}
                      onChange={(e) => update(i, { dateOfBirth: e.target.value })}
                      aria-invalid={!!err.dateOfBirth}
                      className={cn(err.dateOfBirth && 'border-red-400 focus:ring-red-200')}
                    />
                  </Field>
                  <Field className="md:col-span-3" label="Nationality" htmlFor={`nat-${i}`}>
                    <Select id={`nat-${i}`} value={p.nationality} onChange={(e) => update(i, { nationality: e.target.value })}>
                      {NATIONALITIES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {isLead && (
                    <>
                      <Field className="md:col-span-5" label="Email" htmlFor="email" error={err.email}>
                        <Input
                          id="email"
                          type="email"
                          value={p.email}
                          onChange={(e) => update(i, { email: e.target.value })}
                          placeholder="john.smith@example.com"
                          autoComplete="email"
                          aria-invalid={!!err.email}
                          className={cn(err.email && 'border-red-400 focus:ring-red-200')}
                        />
                      </Field>
                      <Field className="md:col-span-5" label="Phone (optional)" htmlFor="phone" error={err.phone}>
                        <Input
                          id="phone"
                          type="tel"
                          value={p.phone}
                          onChange={(e) => update(i, { phone: e.target.value })}
                          placeholder="+44 20 7946 0000"
                          autoComplete="tel"
                          aria-invalid={!!err.phone}
                          className={cn(err.phone && 'border-red-400 focus:ring-red-200')}
                        />
                      </Field>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Summary + submit */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="divide-y divide-slate-100">
            <div className="p-5">
              {flightQ.data ? (
                <ItinerarySummary flight={flightQ.data} fareFamily={fareFamily} cabin={cabin} />
              ) : flightQ.isError ? (
                <p className="text-sm text-red-600">Could not load flight.</p>
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Seats</div>
              <div className="flex flex-wrap gap-2">
                {seats.map((s, i) => (
                  <span key={i} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-semibold text-slate-700">
                    {s ?? '—'}
                  </span>
                ))}
              </div>
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
                <span className="text-2xl font-bold tracking-tight text-amadeus-700">{formatPrice(fareTotal + seatTotal)}</span>
              </div>
            </div>

            <div className="p-5">
              {apiError && (
                <div
                  role="alert"
                  className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={create.isPending || !flightQ.data}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                {create.isPending ? 'Creating PNR…' : 'Create PNR'}
              </Button>
              <p className="mt-2 text-center text-xs text-slate-400">End transaction (ER) is issued automatically.</p>
            </div>
          </Card>
        </aside>
      </form>
    </div>
  );
}

/** Label + control + inline error message wrapper for form fields. */
function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
