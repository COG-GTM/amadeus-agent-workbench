# Amadeus Agent Workbench

An Amadeus-style travel agent workbench: flight availability, fare families, seat map and PNR creation — with a
cryptic-command terminal drawer alongside the modern GUI. Built as a training demo for Devin Desktop: the codebase
ships with seven deliberately unfinished corners that trainees fix with Devin (see
[Training exercises](#training-exercises)).

> **Training demo only.** Not affiliated with, endorsed by or connected to Amadeus IT Group SA. "Amadeus" and
> "Selling Platform Connect" are used purely to make the demo feel familiar to travel agents. All airlines, schedules,
> fares, seats and passengers are synthetic.

<!-- TODO(screenshots): capture and commit to docs/img/ — search.png (hero + form), results.png, seatmap.png, terminal.png -->

| Search                         | Results                          | Seat map                          | Cryptic terminal                   |
| ------------------------------ | -------------------------------- | --------------------------------- | ---------------------------------- |
| ![Search](docs/img/search.png) | ![Results](docs/img/results.png) | ![Seat map](docs/img/seatmap.png) | ![Terminal](docs/img/terminal.png) |

## Prerequisites

- **Node.js 22** (LTS) — `.nvmrc` is provided, so `nvm use` picks it. Anything ≥ 20 works.
- **npm 10+** (ships with Node 22). The repo uses npm workspaces; do not use pnpm/yarn.
- A C++ toolchain is **not** required: `better-sqlite3` downloads a prebuilt binary for supported Node versions.
- For the browser smoke tests only: Chromium via `npx playwright install --with-deps chromium` (CI does this for you).

## Quick start

```bash
git clone https://github.com/COG-GTM/amadeus-agent-workbench.git
cd amadeus-agent-workbench
nvm use            # optional, selects Node 22
npm install
npm run dev        # API on http://localhost:4000, web on http://localhost:5173
```

Open <http://localhost:5173>. The SQLite database (`apps/api/data/workbench.db`) is created and seeded automatically
on first start with 45 days of flights from today. Everything runs offline.

Try it:

1. Search **LHR → JFK** a week from now and pick a fare.
2. Click **Cryptic** in the header and type `HE`, then `RTX7K2PQ`.
3. Retrieve demo bookings `X7K2PQ` or `M3JR8T` from the **Bookings** tab.

## Scripts

All commands run from the repository root.

| Command             | Purpose                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`       | Start API (`tsx watch`) + web (Vite) with hot reload                                    |
| `npm run seed`      | Wipe and rebuild the SQLite database (also resets the 45-day flight window to today)    |
| `npm test`          | Vitest unit + API integration tests across all workspaces                               |
| `npm run e2e`       | Playwright smoke tests in Chromium; boots the dev servers itself or reuses running ones |
| `npm run typecheck` | `tsc --noEmit` in every workspace                                                       |
| `npm run lint`      | ESLint (flat config, TypeScript + React hooks rules)                                    |
| `npm run format`    | Prettier — write mode                                                                   |
| `npm run build`     | Typecheck the API and shared package, production-build the web app                      |

Workspace-scoped variants work too, e.g. `npm test -w apps/api` or `npm run dev -w apps/web`.

## Layout

| Path              | What                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `apps/web`        | React 19 + Vite + Tailwind v4 + React Router 7 + TanStack Query frontend (:5173) |
| `apps/api`        | Express 5 + TypeScript + Zod API over SQLite via `better-sqlite3` (:4000)        |
| `packages/shared` | Domain types and the `API` route table shared by both (consumed as source)       |
| `docs/`           | [Architecture](docs/ARCHITECTURE.md) and [training exercises](docs/EXERCISES.md) |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the request flow, data model, time-handling convention and
testing strategy.

## Demo data

- 16 airlines with bundled logos (BA, AF, KL, LH, IB, LX, AY, VS, EK, QR, SQ, DL, AA, UA, JL, CX).
- 21 airports across Europe, North America, the Gulf and Asia; each carries an IANA timezone.
- 45 days of daily schedules per route; fare families `LIGHT` / `STANDARD` / `FLEX` in Economy and Business.
- ~35 % pre-sold seats so seat maps look lived-in.
- Demo PNRs `X7K2PQ` (BA0117 LHR → JFK in 7 days, seat 14A) and `M3JR8T` (SQ0322 tomorrow, seats 22D/22E).
- Cryptic terminal: `HE` for help, `AN20SEPLHRJFK`, `SS1Y1`, `RT`, `RTX7K2PQ`.

## Training exercises

Seven guided exercises — from a 20-minute timezone bug to a full ancillaries upsell step — each with a scenario, a
copy-pasteable prompt for Devin Desktop, the files involved and acceptance criteria:
**[`docs/EXERCISES.md`](docs/EXERCISES.md)**.

## Troubleshooting

**`better-sqlite3` fails to load after switching Node versions**
(`NODE_MODULE_VERSION xx. This version of Node.js requires NODE_MODULE_VERSION yy`). The native binary is compiled per
Node ABI. Rebuild it for the Node you are now running:

```bash
npm rebuild better-sqlite3
```

If that still fails (e.g. a brand-new Node with no prebuilt binary yet), switch back to Node 22 with `nvm use`.

**Port 4000 or 5173 already in use.** Another dev server (often a previous `npm run dev`) is still running. Find and
stop it:

```bash
lsof -i :4000 -i :5173          # macOS / Linux
kill <pid>
```

The API honours `PORT=4100 npm run dev -w apps/api`, but the Vite proxy in `apps/web/vite.config.ts` points at
`:4000`, so prefer freeing the port over changing it.

**Search returns no flights.** The database was seeded on an earlier day and the 45-day window has drifted, or you
searched a route that isn't in the network. Re-seed with `npm run seed`, then try LHR → JFK.

**Corrupt or stale database.** Delete `apps/api/data/` and restart `npm run dev`; it will re-seed.

**Playwright can't find Chromium.** Run `npx -w apps/web playwright install --with-deps chromium` once.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow, the code-comment convention and the list of imperfections
that must **not** be fixed outside a training exercise.

## Disclaimer

This repository is an independent training artefact. It is not affiliated with, sponsored by or endorsed by Amadeus IT
Group SA or any airline. Trademarks belong to their respective owners; no real schedules, fares or personal data are
included.
