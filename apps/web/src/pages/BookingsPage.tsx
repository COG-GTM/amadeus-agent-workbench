// Retrieve-PNR page: a locator form plus quick links to the seeded demo bookings.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, Search, Ticket } from 'lucide-react';
import { Button, Card, Input, Label } from '@/components/ui';

/** Seeded PNRs that always exist after `npm run seed`. */
const DEMO_PNRS = [
  { locator: 'X7K2PQ', note: 'BA LHR → JFK · seat 14A' },
  { locator: 'M3JR8T', note: 'SQ LHR → SIN · 2 passengers' },
];

/** Locators are 6 alphanumeric characters; we uppercase and strip anything else as the agent types. */
function normalise(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function BookingsPage() {
  const navigate = useNavigate();
  const [locator, setLocator] = useState('');
  const [touched, setTouched] = useState(false);
  const valid = /^[A-Z0-9]{6}$/.test(locator);

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (valid) navigate(`/bookings/${locator}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amadeus-50 text-amadeus-600">
          <Ticket className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Retrieve a PNR</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the six-character record locator — the GUI equivalent of <span className="font-mono">RT</span>.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row sm:items-end" noValidate>
          <div className="flex-1">
            <Label htmlFor="locator">Record locator</Label>
            <Input
              id="locator"
              value={locator}
              onChange={(e) => setLocator(normalise(e.target.value))}
              placeholder="X7K2PQ"
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              className="h-12 font-mono text-xl font-bold uppercase tracking-[0.3em] placeholder:tracking-[0.3em] placeholder:text-slate-300"
              aria-invalid={touched && !valid}
            />
            {touched && !valid && <p className="mt-1 text-xs text-red-600">Enter all six characters of the locator.</p>}
          </div>
          <Button type="submit" size="lg" disabled={!valid}>
            <Search className="h-4 w-4" /> Retrieve
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Demo PNRs</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEMO_PNRS.map((p) => (
            <Link
              key={p.locator}
              to={`/bookings/${p.locator}`}
              className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-card transition hover:border-amadeus-300 hover:shadow-md"
            >
              <div>
                <div className="font-mono text-lg font-bold tracking-widest text-amadeus-700">{p.locator}</div>
                <div className="mt-0.5 text-sm text-slate-500">{p.note}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-amadeus-600" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
