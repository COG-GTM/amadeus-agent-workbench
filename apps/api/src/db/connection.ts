// Single shared SQLite connection. The DB file lives at apps/api/data/workbench.db
// (gitignored) and is created + seeded by `npm run seed`.
import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(here, '..', '..', 'data');
export const DB_PATH = process.env.WORKBENCH_DB ?? join(DATA_DIR, 'workbench.db');

let db: Database.Database | null = null;

/** Returns the process-wide connection, opening it on first use and applying the schema. */
export function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
  return db;
}

/** Opens an isolated in-memory database with the schema applied. Used by tests. */
export function openMemoryDb(): Database.Database {
  const mem = new Database(':memory:');
  mem.pragma('foreign_keys = ON');
  mem.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
  return mem;
}

/** Swap the connection (tests use this to point services at an in-memory DB). */
export function setDb(next: Database.Database) {
  db = next;
}
