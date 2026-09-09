// Cryptic-style PNR display (what an agent would see after `RT<locator>`), generated
// from the structured Pnr object. Pure flavour — nothing here is parsed back.
import { TerminalSquare } from 'lucide-react';
import type { BookedSegment, Pnr } from '@workbench/shared';
import { crypticDate, crypticFlightNumber, crypticTimestamp, crypticWeekday } from '@/lib/format';

/** Office ID shown in the header, matching the AppShell badge. */
const OFFICE_ID = 'LONBA0980';
const AGENT_SIGN = 'HREEVES';

/** Approximate booking class letter for a fare family + cabin combination. */
function bookingClass(seg: BookedSegment): string {
  if (seg.cabin === 'BUSINESS') return seg.fareFamily === 'FLEX' ? 'J' : 'C';
  return seg.fareFamily === 'FLEX' ? 'Y' : seg.fareFamily === 'STANDARD' ? 'M' : 'O';
}

/** Builds the monospace lines of the cryptic display. */
function pnrLines(pnr: Pnr): string[] {
  const lines: string[] = [];
  lines.push(`RP/${OFFICE_ID}/${OFFICE_ID}            AA/SU  ${crypticTimestamp(pnr.createdAt)}  ${pnr.locator}`);

  // Name elements: "1.SMITH/JOHN MR"
  pnr.passengers.forEach((p, i) => {
    const typeSuffix = p.type === 'CHD' ? ' (CHD)' : p.type === 'INF' ? ' (INF)' : '';
    lines.push(`  ${i + 1}.${p.lastName.toUpperCase()}/${p.firstName.toUpperCase()} ${p.title}${typeSuffix}`);
  });

  // Air segments: "2  BA 117 Y 20SEP 1 LHRJFK HK1  0825 1120"
  let n = pnr.passengers.length + 1;
  for (const seg of pnr.segments) {
    const f = seg.flight;
    const dep = f.departure.slice(11, 16).replace(':', '');
    const arr = f.arrival.slice(11, 16).replace(':', '');
    lines.push(
      `  ${n++}  ${crypticFlightNumber(f.flightNumber)} ${bookingClass(seg)} ${crypticDate(f.departure)} ${crypticWeekday(
        f.departure,
      )} ${f.origin.code}${f.destination.code} ${pnr.status}${pnr.passengers.length}  ${dep} ${arr}  *1A/E*`,
    );
  }

  // Contact, ticketing, seats, form of payment, received-from.
  lines.push(`  ${n++} AP ${pnr.contactEmail.toUpperCase()}`);
  const first = pnr.segments[0];
  if (first) lines.push(`  ${n++} TK OK${crypticDate(pnr.createdAt)}/${OFFICE_ID}`);
  pnr.segments.forEach((seg, si) => {
    seg.seats.forEach((seat, pi) => {
      if (!seat) return;
      const f = seg.flight;
      lines.push(
        `  ${n++} SSR RQST ${f.airline.code} ${pnr.status}${1} ${f.origin.code}${f.destination.code}/${seat},P${pi + 1}/S${
          pnr.passengers.length + 1 + si
        }`,
      );
    });
  });
  lines.push(`  ${n++} FP CASH`);
  lines.push(`  ${n++} RF ${AGENT_SIGN}`);
  lines.push(`  ${n++} FA PAX TOTAL EUR ${pnr.totalPrice.toFixed(2)}`);
  return lines;
}

export function PnrView({ pnr }: { pnr: Pnr }) {
  const lines = pnrLines(pnr);
  return (
    <div className="overflow-hidden rounded-xl border border-emerald-900/60 bg-terminal-bg shadow-card">
      <div className="flex items-center justify-between border-b border-emerald-900/60 px-4 py-2 text-xs text-emerald-400/80">
        <span className="flex items-center gap-2 font-mono">
          <TerminalSquare className="h-3.5 w-3.5" /> RT{pnr.locator}
        </span>
        <span className="font-mono">{OFFICE_ID}</span>
      </div>
      <pre className="scrollbar-thin overflow-x-auto px-4 py-3 font-mono text-sm leading-6 text-terminal-fg">
        {lines.join('\n')}
      </pre>
    </div>
  );
}
