// Unit tests for the cryptic terminal: the AN → SS → NM → AP → ET → RT happy
// path plus the main error messages. Runs against an in-memory seeded DB.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { openMemoryDb, setDb } from '../db/connection.ts';
import { seed } from '../db/seed.ts';
import { isoDate } from '../lib/time.ts';
import { getPnr } from './pnr.service.ts';
import { getSession, resetSessions, resolveDate, runCommand } from './terminal.service.ts';
import { ddmmm } from './terminal/format.ts';

const SESSION = 'test-session';
const nextWeek = isoDate(new Date(Date.now() + 7 * 86_400_000));
/** "20SEP"-style token for next week, so AN always hits the seeded schedule window. */
const NEXT_WEEK = ddmmm(nextWeek);

beforeAll(() => {
  const db = openMemoryDb();
  setDb(db);
  seed(db);
});

beforeEach(() => resetSessions());

/** Runs a command in the shared test session. */
const run = (cmd: string) => runCommand(cmd, SESSION);

describe('HE', () => {
  it('lists every supported entry', () => {
    const res = run('he');
    expect(res.ok).toBe(true);
    for (const code of ['AN', 'SS', 'NM', 'AP', 'ET', 'RT', 'IG']) {
      expect(res.lines.some((l) => l.startsWith(code))).toBe(true);
    }
  });
});

describe('resolveDate', () => {
  const today = new Date('2026-09-09T12:00:00Z');

  it('resolves a date later this year', () => {
    expect(resolveDate('20SEP', today)).toBe('2026-09-20');
  });

  it('accepts today', () => {
    expect(resolveDate('09SEP', today)).toBe('2026-09-09');
  });

  it('rejects dates outside the 45-day schedule window', () => {
    expect(resolveDate('01DEC', today)).toBeNull();
  });

  it('rolls a past date into next year (and rejects it as out of window)', () => {
    // 05JAN is before today, so it rolls to 2027 — well beyond 45 days.
    expect(resolveDate('05JAN', today)).toBeNull();
    // A late-December today makes the rollover land inside the window.
    expect(resolveDate('05JAN', new Date('2026-12-28T12:00:00Z'))).toBe('2027-01-05');
  });

  it('rejects impossible dates and garbage', () => {
    expect(resolveDate('31SEP', today)).toBeNull();
    expect(resolveDate('20XYZ', today)).toBeNull();
    expect(resolveDate('SEP20', today)).toBeNull();
  });
});

describe('AN — availability', () => {
  it('renders an Amadeus-style display for LHR-JFK', () => {
    const res = run(`AN${NEXT_WEEK}LHRJFK`);
    expect(res.ok).toBe(true);
    expect(res.lines[0]).toMatch(/^\*\* AMADEUS AVAILABILITY - AN \*\* JFK NEW YORK\.US\s+7 [A-Z]{2} \d{2}[A-Z]{3} 0000$/);
    // First line: BA 117 departs 0825 on a 77W, business + economy classes shown.
    expect(res.lines[1]).toMatch(/^1 {2}BA 117 {2}J\d C\d D\d Y\d B\d H\d M\d K\d\s+\/LHR 5 JFK 4 {2}0825 {2}\d{4} {2}E0\/77W {2}-?\d+:\d{2}$/);
    expect(res.lines.length).toBeGreaterThan(5);
    expect(res.effect?.type).toBe('availability');
    if (res.effect?.type === 'availability') {
      expect(res.effect.query).toEqual({ origin: 'LHR', destination: 'JFK', date: nextWeek, passengers: 1 });
      expect(res.effect.results.length).toBe(res.lines.length - 1);
    }
    expect(getSession(SESSION).lastAvailability.length).toBe(res.lines.length - 1);
  });

  it('caps seat counts at 9', () => {
    const res = run(`AN${NEXT_WEEK}LHRJFK`);
    const counts = res.lines.slice(1).flatMap((l) => [...l.matchAll(/\b[JCDYBHMK](\d)\b/g)].map((m) => Number(m[1])));
    expect(counts.length).toBeGreaterThan(0);
    expect(Math.max(...counts)).toBeLessThanOrEqual(9);
  });

  it('filters by airline with /A', () => {
    const res = run(`an${NEXT_WEEK}lhrjfk/aba`);
    expect(res.ok).toBe(true);
    expect(res.lines.slice(1).every((l) => /^\d+\s+BA /.test(l))).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(run(`an${NEXT_WEEK.toLowerCase()}lhrjfk`).ok).toBe(true);
  });

  it('rejects missing or malformed dates', () => {
    expect(run('AN').lines).toEqual(['NEED DATE']);
    expect(run('ANLHRJFK').lines).toEqual(['NEED DATE']);
    expect(run('AN31SEPLHRJFK').lines).toEqual(['CHECK DATE']);
  });

  it('rejects unknown city codes', () => {
    expect(run(`AN${NEXT_WEEK}XXXJFK`).lines).toEqual(['CHECK CITY CODE']);
    expect(run(`AN${NEXT_WEEK}LHRZZZ`).lines).toEqual(['CHECK CITY CODE']);
  });

  it('reports when no flights serve the route', () => {
    const res = run(`AN${NEXT_WEEK}LHRJFK/AZZ`);
    expect(res.ok).toBe(false);
    expect(res.lines[0]).toMatch(/NO DIRECT FLIGHTS/);
  });
});

describe('SS — sell', () => {
  it('requires a prior availability display', () => {
    expect(run('SS1Y1').lines).toEqual(['NO ITINERARY']);
  });

  it('validates the line number and class', () => {
    run(`AN${NEXT_WEEK}LHRJFK`);
    expect(run('SS1Y99').lines).toEqual(['CHECK LINE NUMBER']);
    expect(run('SS1Q1').lines).toEqual(['CHECK CLASS']);
    expect(run('SS1Y').lines[0]).toMatch(/INVALID ENTRY/);
  });

  it('sells from the chosen line and maps the class to a fare family', () => {
    run(`AN${NEXT_WEEK}LHRJFK`);
    const res = run('SS1Y1');
    expect(res.ok).toBe(true);
    expect(res.lines[0]).toMatch(/^1 {2}BA 117 Y \d{2}[A-Z]{3} [1-7] LHRJFK DK1 {2}0825 \d{4} {2}\d{2}[A-Z]{3} {2}E {2}0 77W$/);
    expect(res.effect).toEqual({ type: 'sell', flightId: `BA0117-${nextWeek}`, fareFamily: 'FLEX' });

    const business = run('SS2C1');
    expect(business.effect).toEqual({ type: 'sell', flightId: `BA0117-${nextWeek}`, fareFamily: 'STANDARD' });
    expect(getSession(SESSION).pendingSegment?.cabin).toBe('BUSINESS');
    expect(getSession(SESSION).pendingSegment?.passengers).toBe(2);

    expect(run('SS1M1').effect).toEqual({ type: 'sell', flightId: `BA0117-${nextWeek}`, fareFamily: 'LIGHT' });
  });
});

describe('NM / AP', () => {
  it('adds passengers and echoes the working area', () => {
    const res = run('NM1SMITH/JOHN MR');
    expect(res.ok).toBe(true);
    expect(res.lines[0]).toMatch(/^RP\/LONBA0980\/LONBA0980/);
    expect(res.lines[1]).toBe('  1.SMITH/JOHN MR');
    run('nm1smith/jane mrs');
    const s = getSession(SESSION);
    expect(s.passengers.map((p) => `${p.lastName}/${p.firstName} ${p.title}`)).toEqual(['SMITH/JOHN MR', 'SMITH/JANE MRS']);
  });

  it('rejects malformed names', () => {
    expect(run('NM1SMITH').lines[0]).toMatch(/INVALID ENTRY/);
    expect(run('NM1SMITH/').lines[0]).toMatch(/INVALID ENTRY/);
    expect(run('NM1/JOHN MR').lines[0]).toMatch(/INVALID ENTRY/);
    // A multi-word given name is fine; the last word is only a title if it is one.
    expect(getSession(SESSION).passengers).toEqual([]);
    run('NM1SMITH/JOHN PAUL');
    expect(getSession(SESSION).passengers[0]).toMatchObject({ firstName: 'JOHN PAUL', title: 'MR' });
  });

  it('stores phone and email contacts', () => {
    run('AP LON 020 7946 0000');
    run('APE-Agent@Example.com');
    const s = getSession(SESSION);
    expect(s.phone).toBe('LON 020 7946 0000');
    expect(s.email).toBe('agent@example.com');
    expect(run('APE-not-an-email').lines).toEqual(['CHECK EMAIL ADDRESS']);
  });
});

describe('ET / RT — end transaction and retrieve', () => {
  it('needs an itinerary and a name', () => {
    expect(run('ET').lines).toEqual(['NO ITINERARY']);
    run(`AN${NEXT_WEEK}LHRJFK`);
    run('SS1Y1');
    expect(run('ET').lines).toEqual(['NEED NAME']);
  });

  it('checks the name count matches the seats sold', () => {
    run(`AN${NEXT_WEEK}LHRJFK`);
    run('SS2Y1');
    run('NM1SMITH/JOHN MR');
    expect(run('ET').lines[0]).toMatch(/^CHECK NUMBER OF NAMES/);
  });

  it('creates a real PNR on the happy path and retrieves it', () => {
    run(`AN${NEXT_WEEK}LHRJFK`);
    run('SS1Y1');
    run('NM1SMITH/JOHN MR');
    run('AP LON 020 7946 0000');
    run('APE-john.smith@example.com');

    const et = run('ET');
    expect(et.ok).toBe(true);
    expect(et.lines[0]).toMatch(/^END OF TRANSACTION COMPLETE - [A-Z2-9]{6}$/);
    const locator = et.lines[0]!.slice(-6);
    expect(et.effect?.type).toBe('retrieve');

    // The PNR is persisted and visible through the regular booking service.
    const pnr = getPnr(locator)!;
    expect(pnr).not.toBeNull();
    expect(pnr.passengers).toHaveLength(1);
    expect(pnr.passengers[0]).toMatchObject({ lastName: 'SMITH', firstName: 'JOHN', title: 'MR' });
    expect(pnr.segments[0]).toMatchObject({ fareFamily: 'FLEX', cabin: 'ECONOMY', seats: [null] });
    expect(pnr.segments[0]!.flight.id).toBe(`BA0117-${nextWeek}`);
    expect(pnr.contactEmail).toBe('john.smith@example.com');

    // Working area is cleared, current PNR remembered.
    const s = getSession(SESSION);
    expect(s.pendingSegment).toBeNull();
    expect(s.passengers).toEqual([]);
    expect(s.currentPnr).toBe(locator);

    const rt = run('RT');
    expect(rt.ok).toBe(true);
    expect(rt.lines[0]).toMatch(new RegExp(`^RP/LONBA0980/LONBA0980\\s+AA/SU  \\d{2}[A-Z]{3}\\d{2}/\\d{4}Z   ${locator}$`));
    expect(rt.lines[1]).toBe('  1.SMITH/JOHN MR');
    expect(rt.lines[2]).toMatch(/^2 {2}BA 117 Y \d{2}[A-Z]{3} [1-7] LHRJFK HK1 {2}0825 \d{4} {2}\d{2}[A-Z]{3} {2}E {2}BA\/[A-Z2-9]{6}$/);
    expect(rt.lines[3]).toBe('  3 AP LON 020 7946 0000');
    expect(rt.lines[4]).toBe('  4 APE JOHN.SMITH@EXAMPLE.COM');
    expect(rt.effect?.type).toBe('retrieve');
    if (rt.effect?.type === 'retrieve') expect(rt.effect.pnr.locator).toBe(locator);
  });

  it('defaults the contact email from the lead passenger', () => {
    run(`AN${NEXT_WEEK}LHRJFK`);
    run('SS1B1');
    run('NM1DOE/JANE MS');
    const et = run('ER');
    expect(et.ok).toBe(true);
    const pnr = getPnr(et.lines[0]!.slice(-6))!;
    expect(pnr.contactEmail).toBe('jane.doe@example.com');
    expect(pnr.segments[0]!.fareFamily).toBe('STANDARD');
    // ER redisplays the PNR after the confirmation line.
    expect(et.lines[2]).toMatch(/^RP\//);
  });

  it('retrieves the seeded demo PNR by locator, including its seat SSR', () => {
    const res = run('RTX7K2PQ');
    expect(res.ok).toBe(true);
    expect(res.lines[0]).toMatch(/X7K2PQ$/);
    expect(res.lines[1]).toBe('  1.DURAND/AMELIE MS');
    expect(res.lines[2]).toMatch(/^2 {2}BA 117 B .* LHRJFK HK1 /);
    expect(res.lines.some((l) => /SSR RQST BA HK1 LHRJFK\/14A,P1$/.test(l))).toBe(true);
    expect(getSession(SESSION).currentPnr).toBe('X7K2PQ');
    expect(run('rt x7k2pq').ok).toBe(true);
  });

  it('reports unknown locators', () => {
    expect(run('RTZZZZZZ').lines).toEqual(['NO MATCH FOR RECORD LOCATOR']);
    expect(run('RT').ok).toBe(false);
  });
});

describe('IG / IR', () => {
  it('IG wipes the working area', () => {
    run(`AN${NEXT_WEEK}LHRJFK`);
    run('SS1Y1');
    run('NM1SMITH/JOHN MR');
    expect(run('IG').lines).toEqual(['IGNORED']);
    const s = getSession(SESSION);
    expect(s.lastAvailability).toEqual([]);
    expect(s.pendingSegment).toBeNull();
    expect(s.passengers).toEqual([]);
    expect(run('SS1Y1').lines).toEqual(['NO ITINERARY']);
  });

  it('IR keeps and redisplays the current PNR', () => {
    run('RTM3JR8T');
    run('NM1SMITH/JOHN MR');
    const res = run('IR');
    expect(res.ok).toBe(true);
    expect(res.lines[0]).toBe('IGNORED');
    expect(res.lines[2]).toMatch(/M3JR8T$/);
    expect(getSession(SESSION).passengers).toEqual([]);
  });
});

describe('unknown entries', () => {
  it('returns the standard invalid-entry message', () => {
    expect(run('XYZZY')).toEqual({ ok: false, lines: ['INVALID ENTRY — TYPE HE FOR HELP'], effect: { type: 'none' } });
  });

  it('keeps sessions isolated', () => {
    run(`AN${NEXT_WEEK}LHRJFK`);
    expect(runCommand('SS1Y1', 'other-session').lines).toEqual(['NO ITINERARY']);
  });
});
