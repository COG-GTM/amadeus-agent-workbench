// One flight in the results list: airline identity, timeline and fare family chips.
import { Clock, Plane } from 'lucide-react';
import type { Cabin, Fare, Flight } from '@workbench/shared';
import { Badge, Card } from '@/components/ui';
import { FareFamilyPicker } from '@/components/FareFamilyPicker';
import { logoUrl } from '@/lib/logos';
import { CABIN_LABEL, dayOffset, formatDuration, formatTime } from '@/lib/format';

interface Props {
  flight: Flight;
  cabin: Cabin; // which cabin's fares to show
  onSelectFare: (flight: Flight, fare: Fare) => void;
}

/** Airline logo with a lettered fallback when no SVG is bundled for the carrier. */
export function AirlineLogo({ code, logo, className = 'h-10 w-10' }: { code: string; logo: string; className?: string }) {
  const url = logoUrl(logo);
  return url ? (
    <img src={url} alt={code} className={`${className} rounded-md object-contain`} />
  ) : (
    <div className={`${className} flex items-center justify-center rounded-md bg-amadeus-100 text-xs font-bold text-amadeus-700`}>
      {code}
    </div>
  );
}

export function FlightCard({ flight, cabin, onSelectFare }: Props) {
  const fares = flight.fares.filter((f) => f.cabin === cabin);
  const offset = dayOffset(flight.departure, flight.arrival);

  return (
    <Card className="grid grid-cols-1 gap-5 p-5 transition hover:shadow-md lg:grid-cols-[1fr_minmax(300px,380px)] lg:gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        {/* Airline identity */}
        <div className="flex items-center gap-3 md:w-44 md:shrink-0">
          <AirlineLogo code={flight.airline.code} logo={flight.airline.logo} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{flight.airline.name}</div>
            <div className="text-xs text-slate-500">
              <span className="font-mono font-medium text-slate-700">{flight.flightNumber}</span> · {flight.aircraft}
            </div>
          </div>
        </div>

        {/* Timeline: departure — duration — arrival */}
        <div className="flex flex-1 items-center gap-3">
          <div className="text-left">
            <div className="text-3xl font-bold tracking-tight text-slate-900">{formatTime(flight.departure)}</div>
            <div className="text-sm font-semibold text-amadeus-700">{flight.origin.code}</div>
            <div className="hidden text-xs text-slate-400 xl:block">{flight.origin.city}</div>
          </div>

          <div className="flex flex-1 flex-col items-center px-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {formatDuration(flight.durationMinutes)}
            </div>
            <div className="relative my-1.5 h-px w-full bg-slate-300">
              <Plane className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 text-amadeus-500" />
            </div>
            <div className="text-xs text-slate-500">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`}</div>
          </div>

          <div className="text-right">
            <div className="flex items-start justify-end gap-1">
              <span className="text-3xl font-bold tracking-tight text-slate-900">{formatTime(flight.arrival)}</span>
              {offset !== 0 && (
                <span className="mt-1 text-xs font-semibold text-sunrise-500">{offset > 0 ? `+${offset}` : offset}</span>
              )}
            </div>
            <div className="text-sm font-semibold text-amadeus-700">{flight.destination.code}</div>
            <div className="hidden text-xs text-slate-400 xl:block">{flight.destination.city}</div>
          </div>
        </div>
      </div>

      {/* Fare families for the selected cabin */}
      <div className="border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <div className="mb-2 flex items-center justify-between">
          <Badge tone="blue">{CABIN_LABEL[cabin]}</Badge>
          <span className="text-xs text-slate-400">Select a fare</span>
        </div>
        <FareFamilyPicker fares={fares} onSelect={(fare) => onSelectFare(flight, fare)} />
      </div>
    </Card>
  );
}
