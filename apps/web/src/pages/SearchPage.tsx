// Landing page: flight search form over a branded hero.
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeftRight, CalendarDays, Search, Users } from 'lucide-react';
import type { Cabin } from '@workbench/shared';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { AirportInput } from '@/components/AirportInput';

/** Default to a week from today so results are never empty on first load. */
function defaultDate(): string {
  return new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
}

export function SearchPage() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('LHR');
  const [destination, setDestination] = useState('JFK');
  const [date, setDate] = useState(defaultDate);
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState<Cabin | ''>('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ origin, destination, date, passengers: String(passengers) });
    if (cabin) params.set('cabin', cabin);
    navigate(`/results?${params}`);
  }

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  return (
    <div className="-mx-4 -mt-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-amadeus-900 via-amadeus-700 to-amadeus-500 px-4 pb-24 pt-14 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium uppercase tracking-widest text-amadeus-200">Air · Availability &amp; Sell</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Find and book flights</h1>
          <p className="mt-3 max-w-xl text-amadeus-100">
            Search availability across {16} carriers, compare fare families and secure seats — the same workflow your
            agents run in the cryptic terminal, in a modern GUI.
          </p>
        </div>
      </section>

      {/* Search card overlapping the hero */}
      <section className="mx-auto -mt-16 max-w-7xl px-4">
        <Card className="p-6">
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <Label htmlFor="origin">From</Label>
              <AirportInput id="origin" value={origin} onChange={setOrigin} />
            </div>
            <div className="flex items-end justify-center md:col-span-1">
              <Button type="button" variant="ghost" size="sm" onClick={swap} aria-label="Swap origin and destination">
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="destination">To</Label>
              <AirportInput id="destination" value={destination} onChange={setDestination} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="date">
                <CalendarDays className="mr-1 inline h-3 w-3" />
                Departure
              </Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="pax">
                <Users className="mr-1 inline h-3 w-3" />
                Pax
              </Label>
              <Select id="pax" value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="cabin">Cabin</Label>
              <Select id="cabin" value={cabin} onChange={(e) => setCabin(e.target.value as Cabin | '')}>
                <option value="">Any</option>
                <option value="ECONOMY">Economy</option>
                <option value="BUSINESS">Business</option>
              </Select>
            </div>
            <div className="md:col-span-12">
              <Button type="submit" size="lg" className="w-full md:w-auto">
                <Search className="h-4 w-4" />
                Search flights
              </Button>
            </div>
          </form>
        </Card>

        {/* Popular routes for one-click demos */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Popular routes</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['LHR', 'JFK', 'London → New York'],
              ['CDG', 'NCE', 'Paris → Nice'],
              ['MAD', 'LHR', 'Madrid → London'],
              ['NRT', 'LAX', 'Tokyo → Los Angeles'],
            ].map(([o, d, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setOrigin(o!);
                  setDestination(d!);
                }}
                className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-card transition hover:border-amadeus-300 hover:shadow-md"
              >
                <div className="text-xs font-semibold text-amadeus-600">
                  {o} → {d}
                </div>
                <div className="mt-1 text-sm text-slate-700">{label}</div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
