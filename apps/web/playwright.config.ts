// Playwright configuration for the browser smoke suite in ./e2e.
//
// `webServer` boots the whole stack (`npm run dev` at the repo root starts both the
// Express API on :4000 and the Vite dev server on :5173) so the tests exercise the
// real proxy path. Locally an already-running `npm run dev` is reused; in CI a fresh
// one is started and torn down.
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Readiness probe goes THROUGH the Vite proxy to the API. Vite answers 5xx while the API
// is still seeding, and Playwright only accepts 2xx-4xx here, so this waits for both.
const READY_URL = `${BASE_URL}/api/health`;

export default defineConfig({
  testDir: './e2e',
  // Smoke tests are few and independent; keep runs short and deterministic.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Run from the monorepo root so the concurrently-managed api+web scripts both start.
    command: 'npm run dev',
    cwd: '../..',
    url: READY_URL,
    reuseExistingServer: !process.env.CI,
    // First start seeds ~45 days of flights into SQLite; allow for that plus a cold Vite boot.
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
