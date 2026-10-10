import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ locale: 'en-GB' });
async function setup(
  page: Page,
  options: {
    count?: number;
    language?: string;
    retentionDays?: number;
    retentionFailure?: boolean;
    holdRetention?: boolean;
    holdDelete?: boolean;
    deleteFailure?: string;
  } = {},
) {
  const vehicles = Array.from({ length: options.count ?? 1 }, (_, index) => ({
    __typename: 'Vehicle',
    id: `vehicle-${index + 1}`,
    brand: 'Ford',
    model: ['Fiesta', 'Focus', 'Puma'][index],
    year: 2020,
    licensePlate: `AB${index + 1}CD`,
    fuelType: 'PETROL',
    latestOdometerKm: 10000 * (index + 1),
  }));
  const events = vehicles.flatMap((vehicle, index) =>
    ['SCHEDULED', 'EXECUTED'].map((status) => ({
      __typename: 'MaintenanceEvent',
      id: `event-${index + 1}-${status}`,
      vehicleId: vehicle.id,
      categoryId: 'category',
      name: `${status === 'SCHEDULED' ? 'Scheduled' : 'Executed'} ${vehicle.model}`,
      status,
      scheduledDate: status === 'SCHEDULED' ? '2030-01-01T00:00:00Z' : null,
      scheduledOdometerKm: null,
      executionDate: status === 'EXECUTED' ? '2020-01-01T00:00:00Z' : null,
      odometerKm: status === 'EXECUTED' ? vehicle.latestOdometerKm : null,
      cost: null,
      provider: null,
      notes: 'Private maintenance notes',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    })),
  );
  const deleted = new Set<string>();
  let retentionFailure = options.retentionFailure ?? false;
  let deleteFailure = options.deleteFailure ?? '';
  let releaseRetention = () => {};
  let releaseDelete = () => {};
  const retentionGate = new Promise<void>((resolve) => {
    releaseRetention = resolve;
  });
  const deleteGate = new Promise<void>((resolve) => {
    releaseDelete = resolve;
  });
  const requests: { operationName: string; variables: Record<string, unknown> }[] = [];
  await page.addInitScript((language) => {
    localStorage.setItem('motory_access_token', 'session');
    localStorage.setItem('motory_language', language);
  }, options.language ?? 'en');
  await page.route('**/graphql', async (route) => {
    const { operationName, variables } = route.request().postDataJSON();
    requests.push({ operationName, variables });
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
    if (operationName === 'Vehicles')
      data = { vehicles: vehicles.filter((v) => !deleted.has(v.id)) };
    if (operationName === 'Vehicle') {
      const vehicle = vehicles.find((v) => v.id === variables.id && !deleted.has(v.id));
      if (vehicle) data = { vehicle };
      else code = 'VEHICLE_NOT_FOUND';
    }
    if (operationName === 'Categories')
      data = { categories: [{ __typename: 'Category', id: 'category', code: 'MAINTENANCE' }] };
    if (operationName === 'MaintenanceEvents') {
      if (deleted.has(variables.vehicleId)) code = 'VEHICLE_NOT_FOUND';
      else data = { maintenanceEvents: events.filter((e) => e.vehicleId === variables.vehicleId) };
    }
    if (operationName === 'MaintenanceEvent') {
      const event = events.find((e) => e.id === variables.id && !deleted.has(e.vehicleId));
      if (event) data = { maintenanceEvent: event };
      else code = 'MAINTENANCE_EVENT_NOT_FOUND';
    }
    if (operationName === 'VehicleDeletionRetentionDays') {
      if (options.holdRetention) await retentionGate;
      if (retentionFailure) code = 'INTERNAL_SERVER_ERROR';
      else data = { vehicleDeletionRetentionDays: options.retentionDays ?? 47 };
    }
    if (operationName === 'DeleteVehicle') {
      if (options.holdDelete) await deleteGate;
      if (deleteFailure) code = deleteFailure;
      else {
        deleted.add(variables.id);
        data = { deleteVehicle: true };
      }
    }
    await route.fulfill({
      json: code
        ? { errors: [{ message: 'Private database details', extensions: { code } }] }
        : { data },
    });
  });
  return {
    requests,
    deleted,
    events,
    releaseRetention,
    releaseDelete,
    setRetentionFailure: (value: boolean) => {
      retentionFailure = value;
    },
    setDeleteFailure: (value: string) => {
      deleteFailure = value;
    },
  };
}
async function openDialog(page: Page) {
  await page.getByRole('button', { name: 'Delete vehicle', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete vehicle', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('read action, keyboard cancellation, exact confirmation, reset and cached retention', async ({
  page,
}) => {
  const state = await setup(page, { retentionDays: 47 });
  await page.goto('/vehicles/new');
  await expect(page.getByRole('button', { name: 'Delete vehicle', exact: true })).toHaveCount(0);
  await page.goto('/vehicles/vehicle-1');
  const trigger = page.getByRole('button', { name: 'Delete vehicle', exact: true });
  await expect(trigger).toHaveText('');
  await expect(trigger).toHaveAttribute('title', 'Delete vehicle');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(trigger).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Delete vehicle', exact: true });
  await expect(dialog).toContainText('Ford Fiesta (AB1CD)');
  await expect(dialog).toContainText('47 days');
  await expect(dialog).not.toContainText('90 days');
  const input = dialog.getByLabel('Confirmation keyword');
  const confirm = dialog.getByRole('button', { name: 'Delete vehicle', exact: true });
  await expect(input).toBeFocused();
  for (const value of ['', 'delete', 'ELIMINA', 'DELETE!']) {
    await input.fill(value);
    await expect(confirm).toBeDisabled();
    await input.press('Enter');
  }
  expect(state.requests.filter((r) => r.operationName === 'DeleteVehicle')).toHaveLength(0);
  await input.fill(' DELETE ');
  await expect(confirm).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(input).toHaveValue('');
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(
    state.requests.filter((r) => r.operationName === 'VehicleDeletionRetentionDays'),
  ).toHaveLength(1);
});

test('Italian confirmation and language changes reevaluate the current keyword', async ({
  page,
}) => {
  const state = await setup(page, { language: 'it', deleteFailure: 'INTERNAL_SERVER_ERROR' });
  await page.goto('/vehicles/vehicle-1');
  const trigger = page.getByRole('button', { name: 'Elimina veicolo', exact: true });
  await expect(trigger).toHaveAttribute('title', 'Elimina veicolo');
  await trigger.click();
  const dialog = page.getByRole('dialog');
  const input = dialog.getByLabel('Parola di conferma');
  await expect(dialog).toContainText('47 giorni');
  await expect(dialog).toContainText('digita ELIMINA');
  await input.fill('ELIMINA');
  await expect(dialog.getByRole('button', { name: 'Elimina veicolo', exact: true })).toBeEnabled();
  // The native modal makes the toolbar inert; dispatch a language change through its existing control.
  await page.getByLabel('Lingua').evaluate((element: HTMLSelectElement) => {
    element.value = 'en';
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(dialog).toContainText('type DELETE');
  await expect(dialog.getByRole('button', { name: 'Delete vehicle', exact: true })).toBeDisabled();
  await dialog.getByLabel('Confirmation keyword').fill('DELETE');
  await page.getByLabel('Language').evaluate((element: HTMLSelectElement) => {
    element.value = 'it';
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(dialog.getByRole('button', { name: 'Elimina veicolo', exact: true })).toBeDisabled();
  await input.fill('ELIMINA');
  await dialog.getByRole('button', { name: 'Elimina veicolo', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'Non è stato possibile eliminare il veicolo. Riprova.',
  );
  await expect(page).toHaveURL(/vehicles\/vehicle-1$/);
  await expect(dialog).not.toContainText('Private database details');
  state.setDeleteFailure('');
  await dialog.getByRole('button', { name: 'Elimina veicolo', exact: true }).click();
  await expect(page).toHaveURL(/home$/);
});

test('retention loading and failure block deletion without inventing a duration; retry recovers', async ({
  page,
}) => {
  const state = await setup(page, { holdRetention: true, retentionFailure: true });
  await page.goto('/vehicles/vehicle-1');
  const dialog = await openDialog(page);
  await expect(dialog.getByRole('status')).toHaveText('Loading retention information…');
  await dialog.getByLabel('Confirmation keyword').fill('DELETE');
  const confirm = dialog.getByRole('button', { name: 'Delete vehicle', exact: true });
  await expect(confirm).toBeDisabled();
  state.releaseRetention();
  await expect(dialog.getByRole('alert')).toHaveText(
    'We could not load the retention information. Please try again.',
  );
  await expect(confirm).toBeDisabled();
  await expect(dialog).not.toContainText('47 days');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled();
  expect(state.requests.filter((r) => r.operationName === 'DeleteVehicle')).toHaveLength(0);
  state.setRetentionFailure(false);
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(dialog).toContainText('47 days');
  await expect(confirm).toBeEnabled();
});

for (const count of [1, 3]) {
  test(`deletion refreshes ${count === 1 ? 'empty garage' : 'vehicle selection, maintenance and FAB'} without reloading`, async ({
    page,
  }) => {
    const state = await setup(page, { count, holdDelete: true });
    await page.goto('/home');
    const target = count === 1 ? 'vehicle-1' : 'vehicle-2';
    if (count > 1) await page.getByLabel('Choose vehicle').selectOption(target);
    const model = count === 1 ? 'Fiesta' : 'Focus';
    await expect(
      page.getByRole('heading', { name: `Scheduled ${model}`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: `Executed ${model}`, exact: true }),
    ).toBeVisible();
    const listCount = state.requests.filter((r) => r.operationName === 'Vehicles').length;
    await page.locator('.dashboard-summary').click();
    await page.evaluate(() => {
      document.documentElement.dataset.navigationMarker = 'preserved';
    });
    const dialog = await openDialog(page);
    await dialog.getByLabel('Confirmation keyword').fill('DELETE');
    await dialog.getByRole('button', { name: 'Delete vehicle', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Deleting…', exact: true })).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
    await expect(dialog.getByLabel('Confirmation keyword')).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    expect(state.requests.filter((r) => r.operationName === 'DeleteVehicle')).toEqual([
      { operationName: 'DeleteVehicle', variables: { id: target } },
    ]);
    state.releaseDelete();
    await expect(page).toHaveURL(/home$/);
    expect(await page.evaluate(() => document.documentElement.dataset.navigationMarker)).toBe(
      'preserved',
    );
    await expect(
      page.getByRole('heading', { name: `Scheduled ${model}`, exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `Executed ${model}`, exact: true })).toHaveCount(
      0,
    );
    expect(state.requests.filter((r) => r.operationName === 'Vehicles').length).toBeGreaterThan(
      listCount,
    );
    expect(state.events).toHaveLength(count * 2);
    if (count === 1) {
      await expect(page.getByText('Your car’s story starts here')).toBeVisible();
      await expect(page.locator('.maintenance-fab')).toHaveCount(0);
      await expect(
        page.getByRole('link', { name: 'Add vehicle', exact: true }).first(),
      ).toBeVisible();
    } else {
      await expect(page.getByLabel('Choose vehicle')).toHaveValue('vehicle-1');
      await expect(page.locator('#selected-vehicle option[value="vehicle-2"]')).toHaveCount(0);
      await expect(page.locator('.dashboard-summary')).toContainText('Ford Fiesta');
      await expect(
        page.getByRole('heading', { name: 'Scheduled Fiesta', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Executed Fiesta', exact: true }),
      ).toBeVisible();
      await expect(page.locator('.maintenance-fab')).toHaveAttribute(
        'href',
        '/maintenance-events/new?vehicleId=vehicle-1',
      );
      await page.getByLabel('Choose vehicle').selectOption('vehicle-3');
      await expect(
        page.getByRole('heading', { name: 'Scheduled Puma', exact: true }),
      ).toBeVisible();
    }
    await page.goBack();
    await expect(page.getByRole('alert')).toHaveText('This resource is unavailable.');
    await expect(page.getByRole('heading', { name: `Ford ${model}`, exact: true })).toHaveCount(0);
  });
}

for (const code of ['INTERNAL_SERVER_ERROR', 'VEHICLE_NOT_FOUND']) {
  test(`deletion ${code} keeps dialog context and permits retry`, async ({ page }) => {
    const state = await setup(page, { deleteFailure: code });
    await page.goto('/vehicles/vehicle-1');
    const dialog = await openDialog(page);
    const input = dialog.getByLabel('Confirmation keyword');
    await input.fill('DELETE');
    await dialog.getByRole('button', { name: 'Delete vehicle', exact: true }).click();
    await expect(dialog.getByRole('alert')).toHaveText(
      code === 'VEHICLE_NOT_FOUND'
        ? 'This resource is unavailable.'
        : 'We could not delete your vehicle. Please try again.',
    );
    await expect(input).toHaveValue('DELETE');
    await expect(page).toHaveURL(/vehicles\/vehicle-1$/);
    expect(state.deleted.size).toBe(0);
    state.setDeleteFailure('');
    await dialog.getByRole('button', { name: 'Delete vehicle', exact: true }).click();
    await expect(page).toHaveURL(/home$/);
  });
}

test('previously cached vehicle and event details are verified before display when access becomes unavailable', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/home');
  await page.getByRole('link', { name: 'View Scheduled Fiesta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Scheduled Fiesta', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await page.locator('.dashboard-summary').click();
  await expect(page.getByRole('heading', { name: 'Ford Fiesta', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page).toHaveURL(/home$/);
  await expect(page.locator('.dashboard-summary')).toBeVisible();
  state.deleted.add('vehicle-1');
  for (const resource of ['Vehicle', 'MaintenanceEvent']) {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/graphql', async (route) => {
      if (route.request().postDataJSON().operationName !== resource) return route.fallback();
      await gate;
      await route.fallback();
    });
    await page.goBack();
    if (resource === 'MaintenanceEvent') await page.goBack();
    await expect(page.getByRole('status').last()).toContainText('Loading');
    await expect(page.getByRole('heading', { name: /Ford Fiesta|Scheduled Fiesta/ })).toHaveCount(
      0,
    );
    await expect(page.getByText('Private maintenance notes', { exact: true })).toHaveCount(0);
    release();
    await expect(page.getByRole('alert')).toHaveText('This resource is unavailable.');
    await expect(page.getByRole('link', { name: 'Back to home', exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: /Edit|Delete vehicle|Delete maintenance event/,
        exact: true,
      }),
    ).toHaveCount(0);
  }
  await page.getByLabel('Language').selectOption('it');
  await expect(page.getByRole('alert')).toHaveText('Questa risorsa non è disponibile.');
  await expect(page.getByRole('link', { name: 'Torna alla home', exact: true })).toHaveAttribute(
    'title',
    'Torna alla home',
  );
});

for (const width of [320, 375, 428, 768, 1280]) {
  test(`vehicle deletion layout and keyboard focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await setup(page);
    await page.goto('/vehicles/vehicle-1');
    const trigger = page.getByRole('button', { name: 'Delete vehicle', exact: true });
    const editBox = await page.getByRole('button', { name: 'Edit', exact: true }).boundingBox();
    const deleteBox = await trigger.boundingBox();
    expect(deleteBox?.width).toBeGreaterThanOrEqual(44);
    expect(deleteBox?.height).toBeGreaterThanOrEqual(44);
    expect(editBox?.y).toBe(deleteBox?.y);
    const dialog = await openDialog(page);
    await expect(dialog).toContainText('47 days');
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const input = dialog.getByLabel('Confirmation keyword');
    await expect(input).toBeFocused();
    await input.fill('DELETE');
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Delete vehicle', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(input).toBeFocused();
    await page.screenshot({ path: `/tmp/motory-vehicle-delete-${width}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  });
}
