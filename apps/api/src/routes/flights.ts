// Flight, airport and airline endpoints.
import { Router } from 'express';
import { z } from 'zod';
import type { FlightSearchResponse } from '@workbench/shared';
import { getFlight, getSeatMap, listAirlines, searchAirports, searchFlights } from '../services/flights.service.ts';

export const flightsRouter = Router();

/** Validates and normalises search query params. */
const searchSchema = z.object({
  origin: z.string().length(3).transform((s) => s.toUpperCase()),
  destination: z.string().length(3).transform((s) => s.toUpperCase()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passengers: z.coerce.number().int().min(1).max(9).default(1),
  cabin: z.enum(['ECONOMY', 'BUSINESS']).optional(),
});

flightsRouter.get('/airports', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  res.json(searchAirports(q));
});

flightsRouter.get('/airlines', (_req, res) => {
  res.json(listAirlines());
});

flightsRouter.get('/flights/search', (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid search query', details: parsed.error.flatten() });
    return;
  }
  const body: FlightSearchResponse = { query: parsed.data, results: searchFlights(parsed.data) };
  res.json(body);
});

flightsRouter.get('/flights/:id', (req, res) => {
  const flight = getFlight(String(req.params.id));
  if (!flight) {
    res.status(404).json({ error: 'Flight not found' });
    return;
  }
  res.json(flight);
});

flightsRouter.get('/flights/:id/seatmap', (req, res) => {
  const map = getSeatMap(String(req.params.id));
  if (!map) {
    res.status(404).json({ error: 'Flight not found' });
    return;
  }
  res.json(map);
});
