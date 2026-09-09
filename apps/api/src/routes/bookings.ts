// Booking (PNR) endpoints.
import { Router } from 'express';
import { z } from 'zod';
import { BookingError, createBooking, getPnr } from '../services/pnr.service.ts';

export const bookingsRouter = Router();

const passengerSchema = z.object({
  type: z.enum(['ADT', 'CHD', 'INF']),
  title: z.enum(['MR', 'MRS', 'MS', 'DR']),
  firstName: z.string().min(1).max(40),
  lastName: z.string().min(1).max(40),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  frequentFlyer: z.string().optional(),
});

const createSchema = z.object({
  flightId: z.string().min(1),
  fareFamily: z.enum(['LIGHT', 'STANDARD', 'FLEX']),
  passengers: z.array(passengerSchema).min(1).max(9),
  seats: z.array(z.string().nullable()),
  contactEmail: z.string().email(),
});

bookingsRouter.post('/bookings', (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid booking request', details: parsed.error.flatten() });
    return;
  }
  try {
    res.status(201).json(createBooking(parsed.data));
  } catch (e) {
    if (e instanceof BookingError) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    throw e;
  }
});

bookingsRouter.get('/bookings/:locator', (req, res) => {
  const pnr = getPnr(String(req.params.locator));
  if (!pnr) {
    res.status(404).json({ error: 'PNR not found' });
    return;
  }
  res.json(pnr);
});
