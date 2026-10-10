import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ locale: 'en-GB' });
const initial = {
  __typename: 'Vehicle',
  id: 'vehicle-1',
  brand: 'Ford',
  model: 'Fiesta',
  year: 2020,
  licensePlate: 'AB123CD',
  fuelType: 'PETROL',
  latestOdometerKm: 12500,
};
async function setup(page: Page, count = 1, failure = '') {
  let vehicles = Array.from({ length: count }, (_, index) => ({
    ...initial,
    id: `vehicle-${index + 1}`,
    model: index ? 'Focus' : 'Fiesta',
    latestOdometerKm: index ? null : 12500,
  }));
  const mutations: Record<string, unknown>[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('motory_access_token', 'session');
    localStorage.setItem('motory_language', 'en');
  });
  await page.route('**/graphql', async (route) => {
    const { operationName, variables } = route.request().postDataJSON();
    let data: object = {};
    let code = '';
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
    if (operationName === 'Categories') data = { categories: [] };
    if (operationName === 'MaintenanceEvents') data = { maintenanceEvents: [] };
    if (operationName === 'Vehicles') data = { vehicles };
    if (operationName === 'Vehicle') {
      const vehicle = vehicles.find((v) => v.id === variables.id);
      if (vehicle) data = { vehicle };
      else code = 'VEHICLE_NOT_FOUND';
    }
    if (operationName === 'CreateVehicle' || operationName === 'UpdateVehicle') {
      mutations.push(variables.input);
      if (failure) code = failure;
      else if (operationName === 'CreateVehicle') {
        const vehicle = {
          ...initial,
          ...variables.input,
          id: 'new-vehicle',
          latestOdometerKm: null,
        };
        vehicles = [vehicle, ...vehicles];
        data = { createVehicle: vehicle };
      } else {
        vehicles = vehicles.map((v) => (v.id === variables.id ? { ...v, ...variables.input } : v));
        data = { updateVehicle: vehicles.find((v) => v.id === variables.id) };
      }
    }
    await route.fulfill({
      json: code
        ? {
            errors: [
              {
                message: 'Private technical detail',
                extensions: {
                  code,
                  ...(code === 'VALIDATION_ERROR'
                    ? { fields: [{ field: 'brand', messages: ['private'] }] }
                    : {}),
                },
              },
            ],
          }
        : { data },
    });
  });
  return mutations;
}
async function fill(page: Page) {
  await page.getByLabel('Brand', { exact: true }).fill('  Alfa   Romeo ');
  await page.getByLabel('Model', { exact: true }).fill(' Golf   GTI ');
  await page.getByLabel('Registration year').fill('2020');
  await page.getByLabel('License plate').fill(' ab 123-cd ');
}
test('toolbar logo uses client navigation and existing authentication guards', async ({ page }) => {
  await setup(page);
  await page.goto('/vehicles/vehicle-1');
  await expect(page.getByRole('heading', { name: 'Ford Fiesta' })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.navigationMarker = 'preserved';
  });
  const logo = page.getByRole('link', { name: 'Motory — Back to home', exact: true });
  await expect(logo).toHaveAttribute('href', '/home');
  await logo.focus();
  await expect(logo).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/home$/);
  expect(await page.evaluate(() => document.documentElement.dataset.navigationMarker)).toBe(
    'preserved',
  );
  await page.addInitScript(() => localStorage.removeItem('motory_access_token'));
  await page.goto('/forgot-password');
  await page.evaluate(() => {
    document.documentElement.dataset.navigationMarker = 'public';
  });
  await logo.click();
  await expect(page).toHaveURL(/login$/);
  expect(await page.evaluate(() => document.documentElement.dataset.navigationMarker)).toBe(
    'public',
  );
  await page.getByLabel('Language').selectOption('it');
  await expect(
    page.getByRole('link', { name: 'Motory — Torna alla home', exact: true }),
  ).toHaveAttribute('title', 'Motory — Torna alla home');
});
test('icon actions are localized, keyboard accessible and confined to the upper row', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/vehicles/vehicle-1');
  const back = page.getByRole('link', { name: 'Back to home', exact: true });
  const edit = page.getByRole('button', { name: 'Edit', exact: true });
  await expect(back).toHaveCount(1);
  await expect(back).toHaveText('');
  await expect(edit).toHaveText('');
  await expect(edit).toHaveAttribute('title', 'Edit');
  await expect(back).toHaveAttribute('title', 'Back to home');
  await expect(page.locator('.vehicle-back')).toHaveCount(0);
  await page.getByLabel('Language').selectOption('it');
  await expect(page.getByRole('link', { name: 'Torna alla home', exact: true })).toHaveAttribute(
    'title',
    'Torna alla home',
  );
  const pencil = page.getByRole('button', { name: 'Modifica', exact: true });
  await expect(pencil).toHaveAttribute('title', 'Modifica');
  await pencil.focus();
  await expect(pencil).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Marca', { exact: true })).toBeVisible();
  await expect(pencil).toHaveCount(0);
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  const arrow = page.getByRole('link', { name: 'Torna alla home', exact: true });
  await arrow.focus();
  await expect(arrow).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/home$/);
});
test('logo navigation preserves unsaved creation protection', async ({ page }) => {
  await setup(page);
  await page.goto('/vehicles/new');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await page.getByLabel('Brand', { exact: true }).fill('Ford');
  await page.getByRole('link', { name: 'Motory — Back to home', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Brand', { exact: true })).toHaveValue('Ford');
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page).toHaveURL(/home$/);
});
test('empty dashboard remains usable and opens creation', async ({ page }) => {
  await setup(page, 0);
  await page.goto('/home');
  await expect(page.getByText('Your car’s story starts here')).toBeVisible();
  await expect(
    page.getByText('Maintenance information will be available after you add a vehicle.'),
  ).toHaveCount(2);
  await page.getByRole('link', { name: 'Add vehicle' }).first().click();
  await expect(page).toHaveURL(/vehicles\/new$/);
});
test('multiple selection, absent mileage, card navigation and language switching', async ({
  page,
}) => {
  await setup(page, 2);
  await page.goto('/home');
  await expect(page.getByText('12,500 km')).toBeVisible();
  await page.getByLabel('Choose vehicle').selectOption('vehicle-2');
  await expect(page.getByText('Mileage unavailable')).toBeVisible();
  await page.getByRole('link', { name: /Ford (Fiesta|Focus)/ }).click();
  await expect(page).toHaveURL(/vehicles\/vehicle-2$/);
  await expect(page.getByRole('heading', { name: 'Ford Focus' })).toBeVisible();
  await page.getByLabel('Language').selectOption('it');
  await expect(page.getByRole('button', { name: 'Modifica', exact: true })).toBeVisible();
});
test('create validates, normalizes, saves and refreshes home', async ({ page }) => {
  const calls = await setup(page, 0);
  await page.goto('/vehicles/new');
  await page.getByRole('button', { name: 'Save vehicle', exact: true }).click();
  await expect(page.getByText('This field is required.')).toHaveCount(4);
  await fill(page);
  await page.getByRole('button', { name: 'Save vehicle', exact: true }).click();
  await expect(page).toHaveURL(/vehicles\/new-vehicle$/);
  await expect(page.getByRole('heading', { name: 'Alfa Romeo Golf GTI' })).toBeVisible();
  expect(calls[0]).toEqual({
    brand: 'Alfa Romeo',
    model: 'Golf GTI',
    year: 2020,
    licensePlate: 'AB 123-CD',
    fuelType: null,
  });
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page.getByText('Mileage unavailable')).toBeVisible();
});
test('read, edit, cancel and save without changing the URL', async ({ page }) => {
  await setup(page);
  await page.goto('/vehicles/vehicle-1');
  await expect(page.locator('main input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Model', { exact: true }).fill('Discard this');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ford Fiesta' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Model', { exact: true }).fill('Puma');
  await page.getByLabel('Fuel type').selectOption('');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ford Puma' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Vehicle saved.');
  await expect(page.locator('main input')).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ford Puma' })).toBeVisible();
});
for (const code of ['VALIDATION_ERROR', 'INTERNAL_SERVER_ERROR']) {
  test(`mutation ${code} preserves editable draft without technical messages`, async ({ page }) => {
    await setup(page, 1, code);
    await page.goto('/vehicles/vehicle-1');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Model', { exact: true }).fill('Puma');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('alert').last()).toBeVisible();
    await expect(page.getByLabel('Model', { exact: true })).toHaveValue('Puma');
    await expect(page.getByText('Private technical detail')).toHaveCount(0);
    if (code === 'VALIDATION_ERROR')
      await expect(page.getByLabel('Brand', { exact: true })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
  });
}
test('unknown vehicle and unauthorized responses are controlled', async ({ page }) => {
  await setup(page);
  await page.goto('/vehicles/missing');
  await expect(page.getByRole('alert')).toHaveText('This resource is unavailable.');
  await page.route('**/graphql', (route) =>
    route.fulfill({
      json: { errors: [{ message: 'private', extensions: { code: 'UNAUTHENTICATED' } }] },
    }),
  );
  await page.goto('/home');
  await expect(page).toHaveURL(/login$/);
});
test('loading and network failure provide localized recovery', async ({ page }) => {
  await setup(page);
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/graphql', async (route) => {
    if (route.request().postDataJSON().operationName !== 'Vehicles') return route.fallback();
    await pending;
    await route.abort('failed');
  });
  await page.goto('/home');
  await expect(page.getByRole('status')).toHaveText('Loading vehicles…');
  release?.();
  await expect(page.getByRole('alert')).toHaveText(
    'We could not load or save your vehicle. Please try again.',
  );
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.getByLabel('Language').selectOption('it');
  await expect(page.getByRole('alert')).toHaveText(
    'Non è stato possibile caricare o salvare il veicolo. Riprova.',
  );
});
test('one vehicle needs no selector and vehicle routes require a session', async ({ page }) => {
  await setup(page);
  await page.goto('/home');
  await expect(page.getByRole('link', { name: /Ford (Fiesta|Focus)/ })).toBeVisible();
  await expect(page.getByLabel('Choose vehicle')).toHaveCount(0);
  await page.addInitScript(() => localStorage.removeItem('motory_access_token'));
  for (const path of ['/vehicles/new', '/vehicles/vehicle-1']) {
    await page.goto(path);
    await expect(page).toHaveURL(/login$/);
    await expect(page.getByRole('button', { name: 'User menu' })).toHaveCount(0);
  }
});
test('unsaved navigation confirms and keyboard menu closes and logs out', async ({ page }) => {
  await setup(page);
  await page.goto('/vehicles/vehicle-1');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Model', { exact: true }).fill('Puma');
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Model', { exact: true })).toHaveValue('Puma');
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page).toHaveURL(/home$/);
  const menu = page.getByRole('button', { name: 'User menu' });
  await menu.focus();
  await expect(menu).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('ada@example.com')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.getByText('ada@example.com')).toHaveCount(0);
  await menu.click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/login$/);
  await expect(menu).toHaveCount(0);
  await expect(page.getByLabel('Language')).toBeVisible();
});
for (const width of [320, 375, 428, 768, 1280]) {
  test(`responsive dashboard and vehicle form at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Ford Fiesta' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `/tmp/motory-home-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: /Ford (Fiesta|Focus)/ }).click();
    const back = page.getByRole('link', { name: 'Back to home', exact: true });
    const edit = page.getByRole('button', { name: 'Edit', exact: true });
    await expect(back).toBeVisible();
    await expect(edit).toBeVisible();
    const backBox = await back.boundingBox();
    const editBox = await edit.boundingBox();
    const titleBox = await page
      .getByRole('heading', { name: 'Ford Fiesta', exact: true })
      .boundingBox();
    expect(backBox!.width).toBeGreaterThanOrEqual(44);
    expect(backBox!.height).toBeGreaterThanOrEqual(44);
    expect(editBox!.width).toBeGreaterThanOrEqual(44);
    expect(editBox!.height).toBeGreaterThanOrEqual(44);
    expect(backBox!.y).toBe(editBox!.y);
    expect(backBox!.x).toBeLessThan(editBox!.x);
    expect(backBox!.y + backBox!.height).toBeLessThan(titleBox!.y);
    await page.screenshot({ path: `/tmp/motory-icon-read-${width}.png`, fullPage: true });
    await edit.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByLabel('License plate')).toBeVisible();
    await page.screenshot({ path: `/tmp/motory-form-${width}.png`, fullPage: true });
    await page.getByLabel('Language').selectOption('it');
    await expect(page.getByLabel('Anno di immatricolazione')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const control = await page.getByLabel('Targa').boundingBox();
    expect(control?.height).toBeGreaterThanOrEqual(44);
  });
}
