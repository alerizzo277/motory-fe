import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ locale: 'en-GB' });
const base = {
  __typename: 'MaintenanceEvent',
  vehicleId: 'vehicle-1',
  categoryId: 'category',
  name: 'Oil',
  status: 'SCHEDULED',
  scheduledDate: null,
  scheduledOdometerKm: null,
  executionDate: null,
  odometerKm: null,
  cost: null,
  provider: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const rows = [
  {
    ...base,
    id: 'past',
    name: 'Past date',
    scheduledDate: '2026-10-09T00:00:00Z',
    scheduledOdometerKm: 12000,
  },
  { ...base, id: 'mileage', name: 'Mileage only', scheduledOdometerKm: 10000 },
  { ...base, id: 'today', name: 'Today date', scheduledDate: '2026-10-10T00:00:00Z' },
  { ...base, id: 'approach', name: 'Approaching date', scheduledDate: '2026-11-01T00:00:00Z' },
  { ...base, id: 'normal', name: 'Normal date', scheduledDate: '2027-01-01T00:00:00Z' },
  { ...base, id: 'hidden', name: 'Sixth scheduled', scheduledDate: '2028-01-01T00:00:00Z' },
  ...Array.from({ length: 6 }, (_, i) => ({
    ...base,
    id: `executed-${i}`,
    name: `Executed ${i}`,
    status: 'EXECUTED',
    executionDate: `2026-10-0${i + 1}T00:00:00Z`,
    cost: i === 5 ? '1234.50' : null,
    odometerKm: i === 5 ? 10000 : null,
  })),
  {
    ...base,
    id: 'other',
    vehicleId: 'vehicle-2',
    name: 'Other vehicle event',
    scheduledOdometerKm: 0,
  },
];
async function setup(
  page: Page,
  options: { language?: string; empty?: boolean; failure?: boolean; delay?: number } = {},
) {
  await page.clock.setFixedTime(new Date('2026-10-10T12:00:00Z'));
  await page.addInitScript((language) => {
    localStorage.setItem('motory_access_token', 'session');
    localStorage.setItem('motory_language', language);
  }, options.language ?? 'en');
  const queries: string[] = [];
  let failure = options.failure;
  await page.route('**/graphql', async (route) => {
    const { operationName, variables } = route.request().postDataJSON();
    queries.push(operationName);
    let data: object = {};
    if (operationName === 'Me')
      data = {
        me: {
          __typename: 'User',
          id: 'user',
          firstName: 'Ada',
          lastName: 'Rossi',
          email: 'ada@example.com',
          role: 'USER',
        },
      };
    if (operationName === 'Vehicles')
      data = {
        vehicles: options.empty
          ? []
          : [1, 2].map((i) => ({
              __typename: 'Vehicle',
              id: `vehicle-${i}`,
              brand: 'Ford',
              model: i === 1 ? 'Fiesta' : 'Focus',
              year: 2020,
              licensePlate: `AB${i}`,
              fuelType: 'PETROL',
              latestOdometerKm: i === 1 ? 10000 : null,
            })),
      };
    if (operationName === 'Categories')
      data = { categories: [{ __typename: 'Category', id: 'category', code: 'MAINTENANCE' }] };
    if (operationName === 'MaintenanceEvents') {
      if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay));
      if (failure) {
        await route.fulfill({
          json: {
            errors: [
              { message: 'Private internals', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
            ],
          },
        });
        return;
      }
      data = { maintenanceEvents: rows.filter((row) => row.vehicleId === variables.vehicleId) };
    }
    if (operationName === 'MaintenanceEvent')
      data = { maintenanceEvent: rows.find((row) => row.id === variables.id) };
    if (operationName === 'Vehicle')
      data = {
        vehicle: {
          __typename: 'Vehicle',
          id: variables.id,
          brand: 'Ford',
          model: 'Fiesta',
          year: 2020,
          licensePlate: 'AB1',
          fuelType: 'PETROL',
          latestOdometerKm: 10000,
        },
      };
    await route.fulfill({ json: { data } });
  });
  return {
    queries,
    recover: () => {
      failure = false;
    },
  };
}
test('FAB, urgency order, five scheduled and five recent, localized format and navigation', async ({
  page,
}) => {
  const { queries } = await setup(page);
  await page.goto('/home');
  const upcoming = page.getByRole('region', { name: 'Upcoming maintenance' });
  const recent = page.getByRole('region', { name: 'Recent maintenance' });
  await expect(upcoming.getByRole('link')).toHaveCount(5);
  await expect(upcoming.getByRole('heading', { level: 3 })).toHaveText([
    'Past date',
    'Mileage only',
    'Today date',
    'Approaching date',
    'Normal date',
  ]);
  await expect(upcoming.getByText('Overdue', { exact: true })).toHaveCount(1);
  await expect(upcoming.getByText('Mileage threshold reached')).toBeVisible();
  await expect(upcoming.getByText('Due soon')).toBeVisible();
  await expect(upcoming.getByText('Oct 10, 2026')).toBeVisible();
  await expect(upcoming.getByText('12,000 km')).toBeVisible();
  await expect(recent.getByRole('heading', { level: 3 })).toHaveText([
    'Executed 5',
    'Executed 4',
    'Executed 3',
    'Executed 2',
    'Executed 1',
  ]);
  await expect(recent.getByText('€1,234.50')).toBeVisible();
  await expect(recent.getByText('10,000 km')).toBeVisible();
  expect(queries.filter((query) => query === 'MaintenanceEvents')).toHaveLength(1);
  const fab = page.getByRole('link', { name: 'Add maintenance event', exact: true });
  await expect(fab).toHaveAttribute('title', 'Add maintenance event');
  await expect(fab).toHaveAttribute('href', '/maintenance-events/new?vehicleId=vehicle-1');
  await fab.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/maintenance-events\/new\?vehicleId=vehicle-1/);
  await expect(fab).toHaveCount(0);
});
test('switching vehicle clears prior records while loading and changes FAB; unknown mileage never warns', async ({
  page,
}) => {
  await setup(page, { delay: 300 });
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Past date' })).toBeVisible();
  await page.getByLabel('Choose vehicle').selectOption('vehicle-2');
  await expect(page.getByRole('heading', { name: 'Past date' })).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: 'Loading maintenance events' }),
  ).toHaveCount(2);
  await expect(
    page.getByRole('link', { name: 'Add maintenance event', exact: true }),
  ).toHaveAttribute('href', '/maintenance-events/new?vehicleId=vehicle-2');
  await expect(page.getByRole('heading', { name: 'Other vehicle event' })).toBeVisible();
  await expect(page.getByText('Mileage threshold reached')).toHaveCount(0);
  await expect(page.getByText('No executed maintenance events.')).toBeVisible();
  await page.getByRole('link', { name: 'View Other vehicle event' }).click();
  await expect(page).toHaveURL(/maintenance-events\/other$/);
});
test('empty garage hides FAB and does not request maintenance', async ({ page }) => {
  const { queries } = await setup(page, { empty: true });
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Your car’s story starts here' })).toBeVisible();
  await expect(page.locator('.maintenance-fab')).toHaveCount(0);
  expect(queries).not.toContain('MaintenanceEvents');
});
test('query failure is localized, distinct from empty, and retry recovers', async ({ page }) => {
  const fixture = await setup(page, { failure: true });
  await page.goto('/home');
  await expect(page.getByRole('alert')).toHaveCount(2);
  await expect(page.getByText('No scheduled maintenance events.')).toHaveCount(0);
  await expect(page.getByText('Private internals')).toHaveCount(0);
  fixture.recover();
  await page.getByRole('button', { name: 'Try again' }).first().click();
  await expect(page.getByRole('heading', { name: 'Past date' })).toBeVisible();
});
for (const width of [320, 375, 428, 768, 1280])
  test(`responsive Italian dashboard ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 760 });
    await setup(page, { language: 'it' });
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Past date' })).toBeVisible();
    const fab = page.getByRole('link', { name: 'Aggiungi intervento', exact: true });
    await expect(fab).toHaveAttribute('title', 'Aggiungi intervento');
    await expect(page.getByText('Scaduto', { exact: true })).toBeVisible();
    await expect(page.getByText('Soglia km raggiunta')).toBeVisible();
    await expect(page.getByText('1234,50 €')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const before = await fab.boundingBox();
    expect(before?.width).toBeGreaterThanOrEqual(44);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    const after = await fab.boundingBox();
    expect(after?.y).toBe(before?.y);
    const last = await page
      .locator('.maintenance-list')
      .last()
      .getByRole('link')
      .last()
      .boundingBox();
    expect((last?.y ?? 0) + (last?.height ?? 0)).toBeLessThan(after?.y ?? 0);
    await page.screenshot({ path: `/private/tmp/motory-dashboard-${width}.png`, fullPage: true });
  });

test('network failures preserve error states and recent cards support keyboard navigation', async ({
  page,
}) => {
  await setup(page);
  let failed = true;
  await page.route('**/graphql', async (route) => {
    if (route.request().postDataJSON().operationName === 'MaintenanceEvents' && failed)
      return route.abort('failed');
    return route.fallback();
  });
  await page.goto('/home');
  await expect(page.getByRole('alert')).toHaveCount(2);
  await expect(page.getByText('No executed maintenance events.')).toHaveCount(0);
  failed = false;
  await page.getByRole('button', { name: 'Try again' }).first().click();
  const card = page.getByRole('link', { name: 'View Executed 5' });
  await expect(card).toBeVisible();
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/maintenance-events\/executed-5$/);
});
