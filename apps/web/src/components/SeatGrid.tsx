// Aircraft-style seat grid. Renders rows of seat buttons with an aisle gap, a
// divider between cabins and a legend. Selection state is owned by the parent.
import { Fragment, type ReactNode } from 'react';
import type { Seat, SeatMap } from '@workbench/shared';
import { cn } from '@/lib/cn';
import { CABIN_LABEL } from '@/lib/format';

interface Props {
  seatMap: SeatMap;
  selected: string[]; // seat numbers currently chosen
  onToggle: (seat: Seat) => void;
}

/**
 * Splits a row into blocks separated by aisles. Two adjacent seats that are both
 * flagged `aisle` sit on opposite sides of an aisle, so we break the row there.
 */
function blocks(row: Seat[]): Seat[][] {
  const out: Seat[][] = [[]];
  row.forEach((seat, i) => {
    const prev = row[i - 1];
    if (prev && prev.aisle && seat.aisle) out.push([]);
    out[out.length - 1]!.push(seat);
  });
  return out;
}

/** Tailwind classes for each seat state. Taken seats keep their click handler on purpose (training exercise). */
function seatClasses(seat: Seat, isSelected: boolean): string {
  if (isSelected) return 'bg-sunrise-400 border-sunrise-500 text-amadeus-950 shadow-md ring-2 ring-sunrise-400/40';
  if (seat.taken) return 'bg-slate-300 border-slate-300 text-slate-500 line-through cursor-not-allowed';
  if (seat.exitRow) return 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100';
  if (seat.extraLegroom) return 'bg-amadeus-50 border-amadeus-300 text-amadeus-800 hover:bg-amadeus-100';
  return 'bg-white border-slate-300 text-slate-700 hover:border-amadeus-500 hover:bg-amadeus-50';
}

export function SeatGrid({ seatMap, selected, onToggle }: Props) {
  const firstRow = seatMap.rows[0];
  if (!firstRow) return null;

  // Column letters use the widest row so headers line up for both cabins.
  const widestRow = seatMap.rows.reduce((a, b) => (b.length > a.length ? b : a), firstRow);

  return (
    <div className="space-y-4">
      <Legend />

      <div className="scrollbar-thin overflow-x-auto">
        {/* Fuselage */}
        <div className="mx-auto w-fit rounded-[3rem] border-2 border-slate-200 bg-slate-50 px-6 pb-10 pt-8">
          {/* Column letters header */}
          <RowShell label="">
            {blocks(widestRow).map((block, bi) => (
              <div key={bi} className="flex gap-1">
                {block.map((s) => (
                  <div key={s.letter} className="w-8 text-center text-[11px] font-semibold text-slate-400">
                    {s.letter}
                  </div>
                ))}
              </div>
            ))}
          </RowShell>

          {seatMap.rows.map((row, ri) => {
            const first = row[0]!;
            const prev = seatMap.rows[ri - 1]?.[0];
            const cabinChange = !prev || prev.cabin !== first.cabin;
            return (
              <Fragment key={first.row}>
                {cabinChange && (
                  <div className="my-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-300" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      {CABIN_LABEL[first.cabin]}
                    </span>
                    <div className="h-px flex-1 bg-slate-300" />
                  </div>
                )}
                {first.exitRow && <ExitMarker />}
                <RowShell label={String(first.row)}>
                  {blocks(row).map((block, bi) => (
                    <div key={bi} className="flex gap-1">
                      {block.map((seat) => {
                        const isSelected = selected.includes(seat.number);
                        return (
                          <button
                            key={seat.number}
                            type="button"
                            onClick={() => onToggle(seat)}
                            aria-pressed={isSelected}
                            aria-label={`Seat ${seat.number}${seat.taken ? ' (taken)' : ''}${seat.price ? `, ${seat.price} EUR` : ''}`}
                            title={`${seat.number}${seat.taken ? ' · taken' : ''}${seat.extraLegroom ? ' · extra legroom' : ''}${seat.price ? ` · +€${seat.price}` : ''}`}
                            className={cn(
                              'h-8 w-8 rounded-t-lg rounded-b-sm border text-[11px] font-medium transition',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amadeus-400',
                              seatClasses(seat, isSelected),
                            )}
                          >
                            {seat.letter}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </RowShell>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** One horizontal row: row number label on both sides, seat blocks with an aisle gap between. */
function RowShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-0.5">
      <div className="w-6 text-right font-mono text-[11px] text-slate-400">{label}</div>
      <div className="flex gap-6">{children}</div>
      <div className="w-6 font-mono text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

/** Small "EXIT" markers drawn on both sides of an exit row. */
function ExitMarker() {
  return (
    <div className="flex items-center justify-between py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
      <span>◂ exit</span>
      <span>exit ▸</span>
    </div>
  );
}

/** Colour key for seat states. */
function Legend() {
  const items: { label: string; className: string }[] = [
    { label: 'Available', className: 'bg-white border-slate-300' },
    { label: 'Selected', className: 'bg-sunrise-400 border-sunrise-500' },
    { label: 'Taken', className: 'bg-slate-300 border-slate-300' },
    { label: 'Extra legroom', className: 'bg-amadeus-50 border-amadeus-300' },
    { label: 'Exit row', className: 'bg-emerald-50 border-emerald-300' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className={cn('inline-block h-4 w-4 rounded-t-md rounded-b-sm border', it.className)} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
