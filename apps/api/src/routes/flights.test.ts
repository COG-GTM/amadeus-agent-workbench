import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.ts';
import { openMemoryDb, setDb } from '../db/connection.ts';
import { seed } from '../db/seed.ts';
import { isoDate } from '../lib/time.ts';

const app = createApp();
const nextWeek = isoDate(new Date(Date.now() + 7 * 86_400_000));

beforeAll(() => {
  const db = openMemoryDb();
  setDb(db);
  seed(db);
});

describe('GET /api/flights/search', () => {
  it('returns LHR-JFK flights sorted by departure', async () => {
    const res = await request(app).get('/api/flights/search').query({
      origin: 'LHR',
      destination: 'JFK',
      date: nextWeek,
      passengers: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThanOrEqual(5);
    const times = res.body.results.map((f: { departure: string }) => f.departure);
    expect(times).toEqual([...times].sort());
    expect(res.body.results[0].airline.logo).toMatch(/\.svg$/);
  });

  it('rejects malformed queries', async () => {
    const res = await request(app).get('/api/flights/search').query({ origin: 'LONDON', destination: 'JFK', date: 'tomorrow' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid search query');
  });
});

describe('GET /api/flights/:id/seatmap', () => {
  it('marks pre-seeded occupancy as taken', async () => {
    const res = await request(app).get(`/api/flights/BA0117-${nextWeek}/seatmap`);
    expect(res.status).toBe(200);
    const seats = res.body.rows.flat();
    expect(seats.some((s: { taken: boolean }) => s.taken)).toBe(true);
    expect(seats.find((s: { number: string }) => s.number === '14A').taken).toBe(true); // held by PNR X7K2PQ
  });
});
