# Amadeus Agent Workbench

An Amadeus-style travel agent workbench: flight availability, fare families, seat map and PNR creation — with a
cryptic-command terminal panel alongside the modern GUI. Built as a training demo for Devin Desktop.

> Training demo only. Not affiliated with Amadeus IT Group. All data is synthetic.

## Quick start

Requires Node 22.13 or later on the 22 line (`.nvmrc` pins 22; ESLint dependencies need 22.13+) and npm. With nvm, run `nvm install` in the repo root to install and switch to it.

```bash
npm install
npm run dev        # API on http://localhost:4000, web on http://localhost:5173
```

The SQLite database (`apps/api/data/workbench.db`) is created and seeded automatically on first start.
Re-seed any time with `npm run seed`.

## Layout

| Path              | What                                                            |
| ----------------- | --------------------------------------------------------------- |
| `apps/web`        | React 19 + Vite + Tailwind v4 frontend                          |
| `apps/api`        | Express 5 + TypeScript + Zod API over SQLite (`better-sqlite3`) |
| `packages/shared` | Domain types and API route constants shared by both             |

## Scripts

| Command             | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start API + web with hot reload              |
| `npm run seed`      | Rebuild the SQLite database from scratch     |
| `npm run build`     | Type-check all workspaces, build the web app |
| `npm test`          | Vitest across all workspaces                 |
| `npm run typecheck` | `tsc --noEmit` across all workspaces         |
| `npm run lint`      | ESLint                                       |
| `npm run format`    | Prettier                                     |

## Demo data

- 16 airlines with bundled logos, 21 airports across Europe, North America, the Gulf and Asia.
- 45 days of schedules starting on the UTC date the database is seeded, fare families `LIGHT` / `STANDARD` / `FLEX` in Economy and Business.
- Demo PNRs `X7K2PQ` and `M3JR8T`.
- Cryptic terminal: only `HE` (help) works today. The help text lists `AN20SEPLHRJFK`, `SS1Y2`, `RT` and `RTX7K2PQ`,
  but they return `INVALID ENTRY`.

## Known issue

`npm test` at the root exits 1 because `apps/web` has no test files yet (`No test files found`). Run the API suite
with `npm test -w apps/api`.
