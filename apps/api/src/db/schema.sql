-- Schema for the workbench database (SQLite).
-- Times on `flights` are LOCAL wall-clock ISO strings without offset; use the
-- airport `tz` column to resolve them to an instant.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS airlines (
  code     TEXT PRIMARY KEY,   -- IATA 2-letter code
  name     TEXT NOT NULL,
  logo     TEXT NOT NULL,      -- filename under apps/web/src/assets/logos
  alliance TEXT                -- oneworld | star | skyteam | NULL
);

CREATE TABLE IF NOT EXISTS airports (
  code    TEXT PRIMARY KEY,    -- IATA 3-letter code
  name    TEXT NOT NULL,
  city    TEXT NOT NULL,
  country TEXT NOT NULL,
  tz      TEXT NOT NULL        -- IANA timezone
);

CREATE TABLE IF NOT EXISTS flights (
  id            TEXT PRIMARY KEY,           -- "BA0011-2026-09-16"
  flight_number TEXT NOT NULL,
  airline_code  TEXT NOT NULL REFERENCES airlines(code),
  origin        TEXT NOT NULL REFERENCES airports(code),
  destination   TEXT NOT NULL REFERENCES airports(code),
  departure     TEXT NOT NULL,              -- local ISO, no offset
  arrival       TEXT NOT NULL,              -- local ISO, no offset
  aircraft      TEXT NOT NULL,
  stops         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_flights_route_date ON flights(origin, destination, departure);

CREATE TABLE IF NOT EXISTS fares (
  flight_id  TEXT NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  family     TEXT NOT NULL,                 -- LIGHT | STANDARD | FLEX
  cabin      TEXT NOT NULL,                 -- ECONOMY | BUSINESS
  price      REAL NOT NULL,                 -- EUR
  seats_left INTEGER NOT NULL,
  PRIMARY KEY (flight_id, family, cabin)
);

-- Seats already sold on a flight. The seat map marks these as `taken`.
CREATE TABLE IF NOT EXISTS seat_assignments (
  flight_id   TEXT NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  pnr_locator TEXT,                          -- NULL for pre-seeded occupancy
  PRIMARY KEY (flight_id, seat_number)
);

CREATE TABLE IF NOT EXISTS pnrs (
  locator       TEXT PRIMARY KEY,            -- 6-char booking reference
  status        TEXT NOT NULL,               -- HK | HL | XX
  created_at    TEXT NOT NULL,               -- ISO instant UTC
  contact_email TEXT NOT NULL,
  total_price   REAL NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'EUR'
);

CREATE TABLE IF NOT EXISTS pnr_passengers (
  pnr_locator     TEXT NOT NULL REFERENCES pnrs(locator) ON DELETE CASCADE,
  idx             INTEGER NOT NULL,          -- passenger index within the PNR
  type            TEXT NOT NULL,             -- ADT | CHD | INF
  title           TEXT NOT NULL,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  date_of_birth   TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  frequent_flyer  TEXT,
  PRIMARY KEY (pnr_locator, idx)
);

CREATE TABLE IF NOT EXISTS pnr_segments (
  pnr_locator  TEXT NOT NULL REFERENCES pnrs(locator) ON DELETE CASCADE,
  idx          INTEGER NOT NULL,
  flight_id    TEXT NOT NULL REFERENCES flights(id),
  fare_family  TEXT NOT NULL,
  cabin        TEXT NOT NULL,
  seats_json   TEXT NOT NULL,                -- JSON array, seats[passengerIdx] -> "12A" | null
  PRIMARY KEY (pnr_locator, idx)
);
