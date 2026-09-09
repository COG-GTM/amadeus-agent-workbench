// Express application factory. Kept separate from server.ts so tests can
// mount the app with supertest without binding a port.
import express from 'express';
import cors from 'cors';
import { flightsRouter } from './routes/flights.ts';
import { bookingsRouter } from './routes/bookings.ts';
import { terminalRouter } from './routes/terminal.ts';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'workbench-api' }));
  app.use('/api', flightsRouter);
  app.use('/api', bookingsRouter);
  app.use('/api', terminalRouter);

  // Fallback error handler: never leak stack traces to the client.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
