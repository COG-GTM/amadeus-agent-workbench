# Contributing

Thanks for helping keep the workbench sharp. This is a training codebase, so two things matter more than usual:
**readability** (trainees read this code with Devin) and **not fixing the bugs that are there on purpose**.

## Setup

```bash
nvm use            # Node 22 from .nvmrc
npm install
npm run dev
```

Editor: open the repo root in VS Code and accept the recommended extensions (`.vscode/extensions.json`). Prettier
formats on save, ESLint runs inline, Tailwind IntelliSense understands the `@theme` tokens in `apps/web/src/styles.css`.

## Workflow

1. Branch from `main`: `git checkout -b feat/<short-slug>` (or `fix/`, `chore/`, `docs/`).
2. Keep changes inside one area where you can — `apps/api`, `apps/web`, `packages/shared`, `docs`. Several people
   often work in parallel on this repo; small, focused PRs merge without conflicts.
3. Before you push, run what CI runs:

   ```bash
   npm run typecheck && npm run lint && npm test && npm run e2e
   ```

4. Open a PR against `main`. Describe _why_, not just _what_; link the exercise if the change belongs to one.
5. Never push to `main` directly.

## Code conventions

- **Comment every file and every non-trivial function.** One or two lines at the top of a file saying what it is for and
  why it exists; a `/** … */` line above each exported function. Look at `apps/api/src/lib/time.ts` or
  `apps/web/src/lib/api.ts` for the tone: short, plain English, explains intent rather than restating the code.
- **TypeScript strict**, `noUncheckedIndexedAccess` on. No `any`, no `as unknown as`; if you need a cast at a DB
  boundary, cast to the concrete row shape (see `FlightRow` in `flights.service.ts`).
- **Shared types live in `packages/shared/src/index.ts`.** Add fields as optional; never rename or remove existing ones
  — both apps and every trainee's branch depend on them.
- **API layering:** routes validate with Zod and map errors to HTTP; services own SQL and domain rules and return shared
  types. Don't put SQL in a route or `res` in a service.
- **Time:** flight times are local wall-clock ISO strings without offset; zones live on airports. Any conversion goes
  through `apps/api/src/lib/time.ts`. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#time-handling).
- **Money:** EUR decimals in the DB today; do new arithmetic in integer cents.
- **Styling:** Tailwind v4 utility classes using the palette tokens (`amadeus-*`, `sunrise-*`, `terminal-*`, `slate-*`).
  No ad-hoc hex colours in components; add a token to `styles.css` instead. Reuse `apps/web/src/components/ui.tsx`.
- **Formatting** is Prettier's job (`.prettierrc`: single quotes, width 120, trailing commas). Don't fight it.
- **Tests:** API tests use a real in-memory SQLite (`openMemoryDb()` + `setDb()` + `seed()`), no mocks. Name files
  `*.test.ts` next to the code. Browser smoke tests go in `apps/web/e2e/` and must not depend on seeded dates beyond
  "today + N days".

## Intentional imperfections — do not fix outside an exercise

These are the training material. If you spot one, resist. Each is documented in
[`docs/EXERCISES.md`](docs/EXERCISES.md):

1. `durationMinutes` ignores timezones (negative westbound durations; skipped test).
2. Seat map lets you pick `taken` seats and the API doesn't reject them.
3. No fare rules (baggage / change / refund) anywhere.
4. UI strings hard-coded in English; no i18n.
5. No tests for `apps/api/src/services/pnr.service.ts`.
6. No ancillaries (bags / meals / lounge).
7. Light theme only; no `dark:` variant.

If you _do_ need to change one of these for a good reason, update `docs/EXERCISES.md` in the same PR so the exercise
still makes sense.

## Commit messages

Conventional-ish: `feat(web): …`, `fix(api): …`, `docs: …`, `chore(ci): …`. Imperative mood, ≤ 72 characters on the
first line, body explains the why.

## Reporting problems

Open a GitHub issue with the command you ran, the Node version (`node -v`) and the output. For anything in the
troubleshooting table in the [README](README.md#troubleshooting), try that first.
