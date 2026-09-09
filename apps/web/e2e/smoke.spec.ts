// Browser smoke tests: prove the stack boots and the core surfaces respond.
//
// Deliberately shallow — these guard "does the app come up and can a user start
// the funnel", not feature behaviour. Feature pages (results, seat map, PNR) are
// covered by their own unit tests and the training exercises, so nothing here
// asserts on results-page content.
import { expect, test } from '@playwright/test';

/** YYYY-MM-DD for `days` from now (UTC), matching the search form's default-date logic. */
function dateDaysOut(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

test.describe('Amadeus Agent Workbench smoke', () => {
  test('home page renders the hero and the Amadeus header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Find and book flights' })).toBeVisible();
    // Header: Amadeus logo (image alt) plus the product name.
    const header = page.getByRole('banner');
    await expect(header.getByAltText('Amadeus')).toBeVisible();
    await expect(header.getByText('Selling Platform Connect')).toBeVisible();
  });

  test('API health endpoint responds through the Vite proxy', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBe(true);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  test('cryptic terminal answers HE with the help banner', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Cryptic' }).click();
    const input = page.getByPlaceholder('AN20SEPLHRJFK');
    await expect(input).toBeFocused();
    await input.fill('HE');
    await input.press('Enter');
    await expect(page.getByText('AMADEUS SELLING PLATFORM — COMMAND HELP')).toBeVisible();
  });

  test('search form navigates to the results route', async ({ page }) => {
    await page.goto('/');
    const date = dateDaysOut(7);

    // Typing opens the airport typeahead; pick the match so the list closes and
    // doesn't sit on top of the submit button.
    await page.getByLabel('From').fill('LHR');
    await page.getByRole('listitem').filter({ hasText: 'London Heathrow' }).getByRole('button').click();
    await page.getByLabel('To').fill('JFK');
    await page.getByRole('listitem').filter({ hasText: 'John F. Kennedy' }).getByRole('button').click();
    await page.getByLabel('Departure').fill(date);

    await page.getByRole('button', { name: 'Search flights' }).click();

    await expect(page).toHaveURL(/\/results\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('origin')).toBe('LHR');
    expect(url.searchParams.get('destination')).toBe('JFK');
    expect(url.searchParams.get('date')).toBe(date);
  });
});
