// Compact itinerary segment card reused by the seat map, passenger form and PNR
// confirmation: airline logo, flight number, date, times/airports, duration and fare badge.
import { Clock } from 'lucide-react';
import type { Cabin, FareFamily, Flight } from '@workbench/shared';
import { Badge } from '@/components/ui';
import { AirlineLogo } from '@/components/FlightCard';
import { CABIN_LABEL, FARE_LABEL, dayOffset, formatDate, formatDuration, formatTime } from '@/lib/format';

interface Props {
  flight: Flight;
  fareFamily?: FareFamily;
  cabin?: Cabin;
}

export function ItinerarySummary({ flight, fareFamily, cabin }: Props) {
  const offset = dayOffset(flight.departure, flight.arrival);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <AirlineLogo code={flight.airline.code} logo={flight.airline.logo} className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">{flight.airline.name}</div>
          <div className="text-xs text-slate-500">
            <span className="font-mono font-medium text-slate-700">{flight.flightNumber}</span> · {flight.aircraft}
          </div>
        </div>
        {fareFamily && (
          <Badge tone={fareFamily === 'FLEX' ? 'amber' : 'blue'}>
            {cabin ? `${CABIN_LABEL[cabin]} ` : ''}
            {FARE_LABEL[fareFamily]}
          </Badge>
        )}
      </div>

      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{formatDate(flight.departure)}</div>

      <div className="flex items-center gap-3">
        <div>
          <div className="text-xl font-bold tracking-tight text-slate-900">{formatTime(flight.departure)}</div>
          <div className="text-xs font-semibold text-amadeus-700">{flight.origin.code}</div>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Clock className="h-3 w-3" /> {formatDuration(flight.durationMinutes)}
          </div>
          <div className="my-1 h-px w-full bg-slate-300" />
          <div className="text-[11px] text-slate-400">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold tracking-tight text-slate-900">
            {formatTime(flight.arrival)}
            {offset !== 0 && <sup className="ml-0.5 text-xs font-semibold text-sunrise-500">+{offset}</sup>}
          </div>
          <div className="text-xs font-semibold text-amadeus-700">{flight.destination.code}</div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span className="truncate">{flight.origin.name}</span>
        <span className="truncate text-right">{flight.destination.name}</span>
      </div>
    </div>
  );
}
