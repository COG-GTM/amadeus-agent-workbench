// Side-by-side LIGHT / STANDARD / FLEX fare chips for one flight and cabin.
// Each chip shows the price and a scarcity hint; clicking one selects that fare.
import { FARE_FAMILIES, type Fare, type FareFamily } from '@workbench/shared';
import { cn } from '@/lib/cn';
import { FARE_LABEL, formatPrice } from '@/lib/format';

interface Props {
  fares: Fare[]; // fares for the cabin being displayed
  selected?: FareFamily; // highlights the chosen family when used read-only
  onSelect?: (fare: Fare) => void;
}

/** Fares below this seat count get an "N seats left" urgency label. */
const SCARCITY_THRESHOLD = 5;

export function FareFamilyPicker({ fares, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {FARE_FAMILIES.map((family) => {
        const fare = fares.find((f) => f.family === family);
        const isFlex = family === 'FLEX';
        const isSelected = selected === family;
        const soldOut = !fare || fare.seatsLeft <= 0;

        // Fare family not offered in this cabin (e.g. no LIGHT in Business) — render a muted placeholder.
        if (!fare) {
          return (
            <div
              key={family}
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{FARE_LABEL[family]}</span>
              <span className="mt-1 text-sm text-slate-300">—</span>
            </div>
          );
        }

        return (
          <button
            key={family}
            type="button"
            disabled={soldOut || !onSelect}
            onClick={() => onSelect?.(fare)}
            aria-pressed={isSelected}
            className={cn(
              'group relative flex flex-col items-center rounded-lg border px-2 py-3 text-center transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amadeus-400 focus-visible:ring-offset-2',
              onSelect && !soldOut && 'hover:-translate-y-0.5 hover:border-amadeus-400 hover:shadow-md',
              isSelected
                ? 'border-amadeus-600 bg-amadeus-50 ring-1 ring-amadeus-600'
                : isFlex
                  ? 'border-sunrise-400/60 bg-gradient-to-b from-white to-sunrise-400/10'
                  : 'border-slate-200 bg-white',
              soldOut && 'opacity-50',
            )}
          >
            <span
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wide',
                isFlex ? 'text-sunrise-500' : 'text-slate-500',
              )}
            >
              {FARE_LABEL[family]}
            </span>
            <span className="mt-1 text-lg font-bold tracking-tight text-slate-900">{formatPrice(fare.price)}</span>
            <span
              className={cn(
                'mt-0.5 text-[11px]',
                fare.seatsLeft < SCARCITY_THRESHOLD ? 'font-medium text-red-600' : 'text-slate-400',
              )}
            >
              {soldOut ? 'Sold out' : fare.seatsLeft < SCARCITY_THRESHOLD ? `${fare.seatsLeft} seats left` : 'per passenger'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
