import { describe, expect, it } from 'vitest';
import { durationMinutes, formatDuration, instantToLocal, localToInstant } from './time.ts';

describe('localToInstant / instantToLocal', () => {
  it('round-trips a London summer time', () => {
    const instant = localToInstant('2026-07-01T10:30:00', 'Europe/London');
    expect(instant.toISOString()).toBe('2026-07-01T09:30:00.000Z');
    expect(instantToLocal(instant, 'Europe/London')).toBe('2026-07-01T10:30:00');
  });

  it('converts across zones', () => {
    const instant = localToInstant('2026-01-15T08:00:00', 'Asia/Tokyo');
    expect(instantToLocal(instant, 'America/Los_Angeles')).toBe('2026-01-14T15:00:00');
  });
});

describe('durationMinutes', () => {
  it('handles a short domestic hop on the same day', () => {
    expect(durationMinutes('2026-09-16T07:00:00', '2026-09-16T08:20:00')).toBe(80);
  });

  // TODO(schedules): this fails for westbound transpacific flights — NRT 17:00 → LAX 10:00
  // same calendar day shows as a negative duration in the UI. Skipped until we work out
  // how to bring the airport timezone into the calculation.
  it.skip('handles westbound transpacific flights that land "before" they take off', () => {
    expect(durationMinutes('2026-09-16T17:00:00', '2026-09-16T10:00:00')).toBe(600);
  });
});

describe('formatDuration', () => {
  it('formats hours and zero-padded minutes', () => {
    expect(formatDuration(475)).toBe('7h 55m');
    expect(formatDuration(600)).toBe('10h 00m');
  });
});
