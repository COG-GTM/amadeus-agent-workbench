// Booking funnel progress indicator (Results → Seats → Passengers → Confirmation).
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const STEPS = ['Results', 'Seats', 'Passengers', 'Confirmation'];

export function Stepper({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-medium" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                done || active ? 'bg-amadeus-600 text-white' : 'bg-slate-200 text-slate-500',
                active && 'ring-4 ring-amadeus-100',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={active ? 'text-slate-900' : 'text-slate-500'}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-slate-300" />}
          </li>
        );
      })}
    </ol>
  );
}
