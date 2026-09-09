# Training exercises

Seven hands-on exercises for the Amadeus Agent Workbench, written for a Devin Desktop training session.
Each one is a real imperfection that was **deliberately left in the codebase**: a bug, a missing feature or a gap in
coverage. The trainee's job is to describe the problem to Devin the way a product owner or a travel agent would, review
what comes back, and steer.

Every exercise has the same shape:

- **Scenario** — the ask, worded as an agent or trainer would say it.
- **Prompt** — copy-pasteable text for Devin Desktop. Adapt it; the point is to practise writing good prompts.
- **Where to look** — exact files involved, so you can check Devin's work.
- **What good looks like** — acceptance bullets.
- **Stretch** — where to go if there is time left.
- **Time** — a realistic estimate for one trainee working with Devin.

Before you start, read the [Facilitator notes](#facilitator-notes) at the bottom, and run the app once:

```bash
npm install
npm run dev        # API http://localhost:4000, web http://localhost:5173
```

---

## Exercise 1 — Dark mode

**Time:** 45–60 min · **Difficulty:** medium (front-end)

### Scenario

> Our night-shift agents in the Sydney office have been asking for this for months. The GUI is a wall of white at 3 a.m.
> and it hurts. We want a proper dark theme — remember my choice, follow my OS setting if I haven't picked one, and put
> the switch somewhere obvious in the header. And please don't touch the cryptic terminal: green-on-black is sacred.

### Prompt

```
Add a dark mode to the web app in apps/web.

- Put a sun/moon theme toggle in the header in apps/web/src/components/AppShell.tsx (use lucide-react icons and the
  existing Button from apps/web/src/components/ui.tsx).
- Persist the choice in localStorage under "workbench.theme". When nothing is stored, follow prefers-color-scheme.
- We use Tailwind v4 (CSS-only config in apps/web/src/styles.css). Register a class-based dark variant with
  `@custom-variant dark (&:where(.dark, .dark *));` and toggle the `dark` class on <html>.
- Restyle the header, cards, inputs, results and footer with dark: variants using the existing amadeus-* / slate palette.
- The terminal drawer (apps/web/src/components/TerminalDrawer.tsx) must stay green-on-black in BOTH themes.
- Avoid a flash of the wrong theme on first paint.
```

### Where to look

- `apps/web/src/components/AppShell.tsx` — header; toggle goes next to the "Cryptic" button.
- `apps/web/src/styles.css` — Tailwind v4 `@theme` tokens; add the `@custom-variant dark` line here.
- `apps/web/src/components/ui.tsx` — shared `Button`, `Card`, `Input`, `Select`, `Label`, `Badge`, `Skeleton`.
- `apps/web/src/components/TerminalDrawer.tsx` — uses the `bg-terminal-bg` / `text-terminal-fg` tokens; leave them alone.
- `apps/web/index.html` — a good place for an inline script that applies the stored theme before React mounts.

### What good looks like

- A visible toggle in the header; clicking it flips the whole page, not just the header.
- Refreshing keeps the chosen theme; clearing localStorage falls back to the OS preference.
- No white flash on reload when dark is selected.
- The terminal drawer looks identical in both modes.
- Contrast is still readable: prices, badges and disabled states in particular.
- `npm run typecheck && npm run lint` pass.

### Stretch

- Add a third "System" option and show which one is active.
- Respect `prefers-reduced-motion` for the drawer transition while you're in there.

---

## Exercise 2 — Overnight / westbound duration bug

**Time:** 20–30 min · **Difficulty:** warm-up (back-end, timezones)

### Scenario

> Agents in Tokyo are laughing at us. Search NRT → LAX and the results show a _negative_ flight time — the flight lands
> "before" it takes off. LHR → JFK is wrong too, it shows about 3 hours for a transatlantic. Eastbound flights look fine.
> There's already a skipped test for this in the repo; whoever wrote it left a TODO.

### Prompt

```
Fix the flight duration calculation in apps/api/src/lib/time.ts.

durationMinutes(departure, arrival) treats both local wall-clock ISO strings as if they were in the same timezone, so
westbound flights (NRT->LAX, LHR->JFK) get wrong or negative durations. Flight times are LOCAL at each airport and the
airports carry IANA tz names (Flight.origin.tz / Flight.destination.tz in packages/shared/src/index.ts).

- Make durationMinutes take the origin and destination timezones and use the existing localToInstant helper.
- Update the call site in apps/api/src/services/flights.service.ts (toFlight) and anywhere else it is used.
- Un-skip and fix the it.skip test in apps/api/src/lib/time.test.ts; add an LHR->JFK case too.
- Do not change the stored data format or the seed's arrival-time calculation.
Run npm test in apps/api to confirm.
```

### Where to look

- `apps/api/src/lib/time.ts` — `durationMinutes` (the bug) and `localToInstant` (the fix).
- `apps/api/src/lib/time.test.ts` — the `it.skip(...)` case with the TODO comment.
- `apps/api/src/services/flights.service.ts` — `toFlight()` computes `durationMinutes` per row; the row already has
  `o_tz` / `d_tz`.
- `apps/api/src/db/seed.ts` — `seedFlights()` already computes arrivals correctly via `localToInstant` /
  `instantToLocal`; useful for understanding the convention.
- `apps/web/src/lib/format.ts#formatDuration` — renders negatives with a leading minus, which is why the UI shows `-7h`.

### What good looks like

- `durationMinutes('2026-09-16T17:00:00', 'Asia/Tokyo', '2026-09-16T10:00:00', 'America/Los_Angeles')` (or an equivalent
  signature) returns `600`.
- LHR → JFK BA0117 shows about 7h 55m; JFK → LHR still shows about 6h 55m.
- The formerly skipped test is un-skipped and green; nothing else in `npm test` regresses.
- `Flight.durationMinutes` in `packages/shared/src/index.ts` is unchanged (it's already "computed server-side").

### Stretch

- Add a test that crosses a DST boundary (e.g. a late-October LHR → JFK) and confirm the duration is stable.
- Ask Devin to explain why `new Date('2026-09-16T17:00:00')` is parsed differently in Node vs. some browsers.

---

## Exercise 3 — Fare rules panel

**Time:** 60–90 min · **Difficulty:** large (full stack)

### Scenario

> Every second call to the help desk is "does LIGHT include a bag?" or "can I change a STANDARD ticket?". The GUI shows
> three prices and nothing else. Agents need the fare conditions right there on the card, and again when they pull up a
> PNR, so they can read them back to the customer.

### Prompt

```
Add fare rules (baggage, change fee, refundability) to the workbench.

- Schema: in apps/api/src/db/schema.sql add a fare_rules table keyed by family (LIGHT/STANDARD/FLEX) with columns for
  checked bags, change fee (EUR), and refundable (boolean). Seed it in apps/api/src/db/seed.ts:
    LIGHT: 0 bags, changes not permitted, non-refundable
    STANDARD: 1 bag, EUR 60 change fee, non-refundable
    FLEX: 2 bags, free changes, refundable
- Extend the Fare type in packages/shared/src/index.ts with an optional `rules` object and populate it in
  apps/api/src/services/flights.service.ts (faresFor). Do not change existing fields.
- Web: show the rules as an expander/tooltip on each fare in the results cards (apps/web/src/pages/ResultsPage.tsx) and
  as a "Fare conditions" block in the PNR view (apps/web/src/pages/ConfirmationPage.tsx). Use lucide-react icons and the
  Badge component from apps/web/src/components/ui.tsx.
- Add an API test asserting GET /api/flights/search returns rules for every fare.
```

### Where to look

- `apps/api/src/db/schema.sql` — current tables; `fares` has `(flight_id, family, cabin, price, seats_left)`.
- `apps/api/src/db/seed.ts` — `reset()` deletes tables in dependency order; a new table must be added there too.
- `packages/shared/src/index.ts` — `Fare`, `FareFamily`, `FARE_FAMILIES`.
- `apps/api/src/services/flights.service.ts` — `faresFor()` maps DB rows to `Fare`.
- `apps/web/src/pages/ResultsPage.tsx`, `apps/web/src/pages/ConfirmationPage.tsx` — display.
- `apps/api/src/routes/flights.test.ts` — the in-memory DB test pattern.

### What good looks like

- Rules are data, not hard-coded in React; the seed defines them once.
- Every `Fare` returned by `/api/flights/search` and `/api/flights/:id` carries the rules for its family.
- Results cards let an agent see bag/change/refund at a glance without leaving the page.
- The PNR view shows the conditions for the booked fare family.
- `npm run seed` still works from scratch; `npm test` has a new assertion; typecheck and lint pass.

### Stretch

- Show the rules inside the cryptic terminal too (`FQN` in real Amadeus): `FQN1` → rules for line 1.
- Make the rules per cabin (Business FLEX includes lounge access, say).

---

## Exercise 4 — Seat-map double booking

**Time:** 30–45 min · **Difficulty:** warm-up+ (full stack, small)

### Scenario

> We double-sold 14A on a BA flight yesterday. Two PNRs, one seat. The seat map shows the seat as taken but still lets
> you click it, and the API just accepts whatever seat number you post. That must never happen again: block it in the
> GUI and reject it on the server with a clear message.

### Prompt

```
Prevent double-booking seats.

1. Server: in apps/api/src/services/pnr.service.ts createBooking() never checks seat_assignments. Before inserting,
   look up every requested seat for that flight_id; if any is already assigned throw BookingError with status 409 and a
   message listing the conflicting seat numbers (e.g. "Seat 14A is already taken").
   Also validate that each seat exists on the aircraft layout (use getSeatMap from flights.service.ts).
2. Client: in apps/web/src/pages/SeatMapPage.tsx make seats with `taken === true` non-selectable (disabled button,
   aria-disabled, tooltip "Taken"), while keeping them visually distinct.
3. Test: add a Supertest case to apps/api/src/routes/bookings.test.ts (new file, copy the in-memory DB pattern from
   apps/api/src/routes/flights.test.ts) that posts a booking for seat 14A on BA0117 seven days out (held by demo PNR
   X7K2PQ) and expects a 409.
```

### Where to look

- `apps/api/src/services/pnr.service.ts` — `createBooking()`; note the `INSERT OR REPLACE INTO seat_assignments`, which
  silently steals the seat.
- `apps/api/src/db/schema.sql` — `seat_assignments(flight_id, seat_number, pnr_locator)`.
- `apps/api/src/routes/bookings.ts` — maps `BookingError.status` to the HTTP response; already returns `{ error }`.
- `apps/web/src/pages/SeatMapPage.tsx` — seat rendering and selection.
- `packages/shared/src/index.ts` — `Seat.taken` has a doc comment: "taken seats must not be selectable".
- `apps/api/src/routes/flights.test.ts` — asserts 14A is taken on `BA0117-<next week>`; reuse that flight.

### What good looks like

- Clicking a taken seat does nothing (and is keyboard-inaccessible as a choice); a hover/tooltip explains why.
- `POST /api/bookings` with a taken seat returns `409 { error: "Seat 14A is already taken" }` and writes nothing
  (transaction not started or rolled back — check `pnrs` count is unchanged).
- The `INSERT OR REPLACE` becomes a plain `INSERT` (the primary key now protects us).
- New test is green; existing tests untouched.

### Stretch

- Handle the race: two agents pick the same free seat; the second one to submit gets the 409 and the seat map refreshes
  showing it taken.
- Surface the 409 message in the passengers page instead of a generic "Booking failed".

---

## Exercise 5 — French i18n

**Time:** 60–90 min · **Difficulty:** large (front-end, wide)

### Scenario

> Amadeus is a French company and half our pilot agencies are in Paris and Nice. Everything in the GUI is hard-coded
> English. We need French, switchable from the header, and we'll add more languages later so do it properly. One rule:
> the cryptic terminal stays exactly as it is — uppercase English is the standard everywhere in the world.

### Prompt

```
Internationalise the web app (apps/web) and add a French translation.

- Add react-i18next + i18next (pin versions at least a week old). Create apps/web/src/i18n/ with en.json and fr.json,
  and an init module imported once from apps/web/src/main.tsx.
- Extract every user-visible string from apps/web/src/pages/*.tsx and apps/web/src/components/*.tsx into en.json using
  stable, namespaced keys (search.title, results.noFlights, seats.legend.taken...). Keep interpolation for counts and
  prices; use the existing formatPrice/formatDate helpers in apps/web/src/lib/format.ts and make formatDate honour the
  active locale.
- Language switcher (EN / FR) in the header in apps/web/src/components/AppShell.tsx; persist under
  localStorage "workbench.lang"; default from navigator.language.
- Do NOT translate anything in apps/web/src/components/TerminalDrawer.tsx or the API's terminal output — it stays
  uppercase English.
- Provide real French for fr.json (not machine-garbled): e.g. "Rechercher des vols", "Aller", "Passagers", "Cabine".
```

### Where to look

- `apps/web/src/pages/SearchPage.tsx` — hero copy, labels, "Popular routes".
- `apps/web/src/pages/ResultsPage.tsx`, `SeatMapPage.tsx`, `PassengersPage.tsx`, `ConfirmationPage.tsx`,
  `BookingsPage.tsx` — the bulk of the strings.
- `apps/web/src/components/AppShell.tsx` — nav labels, footer disclaimer, and the new switcher.
- `apps/web/src/lib/format.ts` — `formatDate` is hard-coded to `en-GB`; `FARE_LABEL` needs translating too.
- `apps/web/src/components/TerminalDrawer.tsx` — must be left alone.
- `apps/web/src/components/AirportInput.tsx` — placeholder "City or airport".

### What good looks like

- A grep for quoted English in `apps/web/src/pages` finds nothing user-visible left behind.
- Switching to FR re-renders instantly, survives a refresh, and formats dates as `mer. 16 sept.`.
- Fare family labels, passenger titles (MR/MRS/MS/DR) and cabin names are translated; IATA codes and locators are not.
- The terminal drawer and its output are byte-for-byte unchanged.
- `npm run typecheck && npm run lint` pass; the `e2e` smoke test still finds "Find and book flights" in the default (EN)
  locale.

### Stretch

- Type-safe keys: generate a `TranslationKey` union from `en.json` so a typo fails `tsc`.
- Add Spanish (`es`) to prove the pattern scales.

---

## Exercise 6 — PNR service tests

**Time:** 30–45 min · **Difficulty:** warm-up (testing)

### Scenario

> `pnr.service.ts` is the one file that touches money and inventory, and it has zero tests. Before we let anyone refactor
> it for the seat-conflict fix or the ancillaries work, I want a safety net. Use the same in-memory SQLite approach the
> flights tests use — no mocks.

### Prompt

```
Add unit tests for apps/api/src/services/pnr.service.ts in a new file apps/api/src/services/pnr.service.test.ts.

Use the existing pattern from apps/api/src/routes/flights.test.ts: openMemoryDb() + setDb() from
apps/api/src/db/connection.ts and seed() from apps/api/src/db/seed.ts in beforeAll. Cover:
- generateLocator(): 6 chars, only from the alphabet ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no 0/O/1/I), unique across 1000 calls.
- createBooking(): decrements fares.seats_left for the chosen family/cabin by the passenger count.
- createBooking(): throws BookingError (400) for a fare family the flight does not offer.
- createBooking(): throws BookingError when seats.length !== passengers.length.
- getPnr(): round-trips a booking (locator, uppercase names, seats, totalPrice = price * pax); returns null for an
  unknown locator; is case-insensitive on the locator.
Use flight id `BA0117-<YYYY-MM-DD seven days out>` (see isoDate in apps/api/src/lib/time.ts). Do not modify the service.
```

### Where to look

- `apps/api/src/services/pnr.service.ts` — `generateLocator`, `BookingError`, `createBooking`, `getPnr`.
- `apps/api/src/routes/flights.test.ts` — `beforeAll(() => { const db = openMemoryDb(); setDb(db); seed(db); })`.
- `apps/api/src/db/connection.ts` — `openMemoryDb()`, `setDb()`.
- `apps/api/src/db/seed.ts` — `seedPnrs()` shows which flights the demo PNRs sit on.
- `packages/shared/src/index.ts` — `CreateBookingRequest`, `Passenger` shapes for building fixtures.

### What good looks like

- One `describe` per function; fixtures built with a small helper, not copy-pasted.
- Inventory assertion reads `seats_left` straight from the in-memory DB before and after.
- Error tests assert both the class (`toBeInstanceOf(BookingError)`) and `.status`.
- `npm test -w apps/api` runs green in under a few seconds; no changes to non-test files.

### Stretch

- Property-style test: book N random passengers and check `totalPrice` never drifts from `round2(price * N)`.
- Assert that a failed booking leaves no partial rows (pnrs / pnr_passengers / seat_assignments) — this will inform
  Exercise 4.

---

## Exercise 7 — Ancillaries upsell

**Time:** 90–120 min · **Difficulty:** large (full stack, new step in the funnel)

### Scenario

> Ancillaries are where the margin is. After the agent picks seats and before they type in the passengers, we want an
> optional "Extras" step: checked bags, meals, lounge access. Show a running total as they add things, carry it into the
> PNR, and print it on the confirmation. Prices are in euros and cents — and I do **not** want to see €89.99000001 on a
> customer's confirmation ever again.

### Prompt

```
Add an ancillaries (extras) step to the booking funnel.

API (apps/api):
- schema.sql: new tables `ancillaries(code PK, name, description, price_cents INTEGER, per_passenger BOOLEAN)` and
  `pnr_ancillaries(pnr_locator FK, passenger_idx, code FK, quantity)`. Add both to reset() in seed.ts and seed:
  BAG23 "Checked bag 23kg" 3500, MEAL "Hot meal" 1450, LOUNGE "Lounge access" 4900, WIFI "Wi-Fi pass" 1299.
- GET /api/ancillaries -> list. Add `ancillaries` to the API route table in packages/shared/src/index.ts.
- Extend CreateBookingRequest with optional `ancillaries: { passengerIdx: number; code: string; quantity: number }[]`
  and Pnr with `ancillaries` (resolved with name and price). Existing fields stay unchanged.
- pnr.service.ts: validate codes, persist rows, and include ancillaries in totalPrice.

Web (apps/web):
- New page apps/web/src/pages/AncillariesPage.tsx at /flights/:id/extras between seats and passengers; wire it in
  apps/web/src/main.tsx and update the "Continue" links on SeatMapPage / back link on PassengersPage.
- Per-passenger +/- controls; a sticky summary with fare + seats + extras and a running total.
- Show chosen extras on ConfirmationPage.tsx.

Money: prices are EUR with cents. Do all arithmetic in integer cents (or a tiny money helper) and convert to a decimal
only when rendering via formatPrice in apps/web/src/lib/format.ts. No floating-point sums of decimals.
```

### Where to look

- `apps/api/src/db/schema.sql`, `apps/api/src/db/seed.ts` — new tables + seed rows; remember `reset()` order.
- `packages/shared/src/index.ts` — `CreateBookingRequest`, `Pnr`, `API`. **Add**, don't change.
- `apps/api/src/services/pnr.service.ts` — total is currently `round2(fare.price * pax)`; note the `seatSurcharge * 0`
  placeholder, a hint that pricing was never finished.
- `apps/api/src/routes/bookings.ts` — Zod `createSchema` must accept the new optional array.
- `apps/web/src/main.tsx` — route table with the funnel order in a comment.
- `apps/web/src/pages/SeatMapPage.tsx`, `PassengersPage.tsx`, `ConfirmationPage.tsx` — navigation and display.
- `apps/web/src/lib/format.ts#formatPrice` — the only place a number becomes "€35.00".

### What good looks like

- The funnel is search → results → seats → **extras** → passengers → confirmation, and "skip" is one click.
- Running total updates as you add extras; the same number appears on the confirmation and in `GET /api/bookings/:locator`.
- Totals are exact: 3 × 12.99 shows €38.97, never €38.970000000000006. Grep for `* 100` / `/ 100` in one helper only.
- Unknown ancillary codes are rejected with a 400 `{ error }`.
- Existing demo PNRs `X7K2PQ` / `M3JR8T` still load (no ancillaries → empty array).
- Typecheck, lint, tests and the Playwright smoke suite pass.

### Stretch

- Per-fare-family inclusions: FLEX already includes a bag, so BAG23 shows "Included" and €0 for FLEX bookings (pairs
  with Exercise 3).
- Cryptic: `SR` style command to add an extra from the terminal.

---

## Facilitator notes

### Suggested order

| Slot         | Exercises                                                                | Why                                                                                  |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Warm-ups     | **2** (duration bug) → **4** (double booking) → **6** (PNR tests)        | Small, back-end, verifiable with `npm test`; teaches prompt precision and reviewing. |
| Main session | **1** (dark mode), **3** (fare rules), **5** (i18n), **7** (ancillaries) | Larger, cross-cutting; pick one or two per trainee; 3 and 7 pair well together.      |

Run the warm-ups as a group, then let trainees choose a main exercise. Doing 6 before 4 or 7 gives them a test harness
to lean on when Devin refactors `pnr.service.ts`.

### Resetting the database

The SQLite file lives at `apps/api/data/workbench.db` (gitignored). Wipe and re-seed at any time:

```bash
npm run seed
```

Flights are generated for 45 days from **today**, so a database seeded last week has fewer future dates; re-seed at the
start of each session. Demo PNRs `X7K2PQ` (BA0117 LHR → JFK, 7 days out, seat 14A) and `M3JR8T` (SQ0322, tomorrow,
seats 22D/22E) are recreated on every seed.

### Cryptic terminal cheat sheet

Open the drawer with the **Cryptic** button in the header. Commands are case-insensitive; output is uppercase.

| Command            | Meaning                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `HE`               | Help — lists the supported commands.                                         |
| `AN20SEPLHRJFK`    | Availability, 20 Sep, LHR → JFK. Append `/AAF` to filter to one airline.     |
| `SS1Y1`            | Sell 1 seat, class Y, from line 1 of the last availability display.          |
| `NM1SMITH/JOHN MR` | Add a name element: one passenger, surname SMITH, first name JOHN, title MR. |
| `ET`               | End transact — save the PNR and return the record locator.                   |
| `RT`               | Retrieve the PNR currently in the session.                                   |
| `RTX7K2PQ`         | Retrieve PNR `X7K2PQ` by locator.                                            |
| `IG`               | Ignore — discard the in-progress PNR.                                        |

The server-side parser lives in `apps/api/src/services/terminal.service.ts`; only `HE` is guaranteed in the scaffold and
the rest arrive with the terminal feature work. If a command answers `INVALID ENTRY — TYPE HE FOR HELP`, that is
itself a talking point: ask a trainee to implement it.

### Running the checks trainees will be judged on

```bash
npm run typecheck && npm run lint && npm test && npm run e2e
```

`npm run e2e` starts the API and web servers itself (or reuses a running `npm run dev`).
