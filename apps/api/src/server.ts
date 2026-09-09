// API entry point. Seeds the database automatically on first run so
// `npm run dev` works with zero manual steps.
import { createApp } from './app.ts';
import { getDb } from './db/connection.ts';
import { seed } from './db/seed.ts';

const PORT = Number(process.env.PORT ?? 4000);

const db = getDb();
const { n } = db.prepare('SELECT COUNT(*) AS n FROM flights').get() as { n: number };
if (n === 0) {
  console.log('Empty database — seeding…');
  seed(db);
}

createApp().listen(PORT, () => {
  console.log(`workbench-api listening on http://localhost:${PORT}`);
});
