import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ locale: 'en-GB', timezoneId: 'Pacific/Honolulu' });
async function setup(
  page: Page,
  options: {
    language?: string;
    role?: string;
    empty?: boolean;
    holdList?: boolean;
    holdRestore?: boolean;
    holdProfile?: boolean;
    listFailure?: boolean;
    restoreFailure?: string;
    profileFailure?: string;
  } = {},
) {
  const user = {
    __typename: 'User',
    id: 'owner',
    firstName: 'Ada',
    lastName: 'Rossi',
    email: 'ada@example.com',
    role: options.role ?? 'USER',
  };
  const active = {
    __typename: 'Vehicle',
    id: 'active',
    brand: 'Toyota',
    model: 'Yaris',
    year: 2020,
    licensePlate: 'ACTIVE',
    fuelType: null,
    latestOdometerKm: 5000,
  };
  const recoverable = {
    __typename: 'DeletedVehicle',
    id: 'deleted',
    brand: 'Ford',
    model: 'Fiesta',
    year: 2011,
    licensePlate: 'AB123CD',
    deletedAt: '2026-10-10T00:15:00.000Z',
    recoveryDeadline: '2026-11-06T00:15:00.000Z',
  };
  const restoredVehicle = {
    ...active,
    id: recoverable.id,
    brand: recoverable.brand,
    model: recoverable.model,
    licensePlate: recoverable.licensePlate,
    year: recoverable.year,
  };
  const event = {
    __typename: 'MaintenanceEvent',
    id: 'event',
    vehicleId: 'deleted',
    categoryId: 'category',
    name: 'Preserved oil change',
    status: 'EXECUTED',
    scheduledDate: null,
    scheduledOdometerKm: null,
    executionDate: '2020-01-01T00:00:00.000Z',
    odometerKm: 5000,
    cost: null,
    provider: null,
    notes: 'Original history',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  };
  let wasRestored = false;
  let listFailure = options.listFailure ?? false;
  let restoreFailure = options.restoreFailure ?? '';
  let profileFailure = options.profileFailure ?? '';
  let releaseList = () => {};
  let releaseRestore = () => {};
  let releaseProfile = () => {};
  const listGate = new Promise<void>((resolve) => {
    releaseList = resolve;
  });
  const restoreGate = new Promise<void>((resolve) => {
    releaseRestore = resolve;
  });
  const profileGate = new Promise<void>((resolve) => {
    releaseProfile = resolve;
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
    if (operationName === 'Me') data = { me: user };
    if (operationName === 'UpdateProfile') {
      const responseUser = { ...user };
      if (options.holdProfile) await profileGate;
      if (profileFailure) code = profileFailure;
      else {
        Object.assign(responseUser, variables.input);
        if (user.id === responseUser.id) Object.assign(user, responseUser);
        data = { updateProfile: responseUser };
      }
    }
    if (operationName === 'DeletedVehicles') {
      if (options.holdList) await listGate;
      if (listFailure) code = 'INTERNAL_SERVER_ERROR';
      else data = { deletedVehicles: options.empty || wasRestored ? [] : [recoverable] };
    }
    if (operationName === 'RestoreVehicle') {
      if (options.holdRestore) await restoreGate;
      if (restoreFailure) code = restoreFailure;
      else {
        wasRestored = true;
        data = { restoreVehicle: true };
      }
    }
    if (operationName === 'Vehicles')
      data = { vehicles: wasRestored ? [active, restoredVehicle] : [active] };
    if (operationName === 'Vehicle') {
      if (variables.id === 'deleted' && !wasRestored) code = 'VEHICLE_NOT_FOUND';
      else data = { vehicle: variables.id === 'deleted' ? restoredVehicle : active };
    }
    if (operationName === 'MaintenanceEvents')
      data = { maintenanceEvents: variables.vehicleId === 'deleted' && wasRestored ? [event] : [] };
    if (operationName === 'MaintenanceEvent') {
      if (!wasRestored) code = 'MAINTENANCE_EVENT_NOT_FOUND';
      else data = { maintenanceEvent: event };
    }
    if (operationName === 'Categories')
      data = { categories: [{ __typename: 'Category', id: 'category', code: 'MAINTENANCE' }] };
    await route.fulfill({
      json: code
        ? { errors: [{ message: 'Private technical details', extensions: { code } }] }
        : { data },
    });
  });
  return {
    requests,
    user,
    recoverable,
    releaseList,
    releaseRestore,
    releaseProfile,
    setListFailure(value: boolean) {
      listFailure = value;
    },
    setRestoreFailure(value: string) {
      restoreFailure = value;
    },
    setProfileFailure(value: string) {
      profileFailure = value;
    },
  };
}
async function openRestore(page: Page, italian = false) {
  await page
    .getByRole('button', { name: italian ? 'Ripristina veicolo' : 'Restore vehicle', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: italian ? 'Ripristinare il veicolo?' : 'Restore vehicle?',
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('protected settings routes reject anonymous access', async ({ page }) => {
  for (const path of ['/settings', '/settings/profile', '/settings/deleted-vehicles']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});
test('toolbar settings navigation closes the menu, uses keyboard and preserves logout', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/home');
  await page.evaluate(() => {
    document.documentElement.dataset.navigationMarker = 'same-document';
  });
  await page.getByRole('button', { name: 'User menu' }).click();
  const link = page.getByRole('link', { name: 'Settings', exact: true });
  await expect(link).toBeVisible();
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator('#user-menu')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByText('Ada Rossi', { exact: true })).toBeVisible();
  await expect(page.getByText('ada@example.com', { exact: true })).toBeVisible();
  await expect(page.getByText('USER', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Administrator', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.navigationMarker)).toBe(
    'same-document',
  );
  await page.getByRole('link', { name: 'Personal information' }).click();
  await expect(page).toHaveURL(/\/settings\/profile$/);
  await page.getByRole('link', { name: 'Back to settings' }).click();
  await page.getByRole('link', { name: 'Deleted vehicles' }).click();
  await expect(page).toHaveURL(/\/settings\/deleted-vehicles$/);
  await page.getByRole('link', { name: 'Back to settings' }).click();
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
test('administrator label follows the authenticated role in both languages', async ({ page }) => {
  await setup(page, { role: 'ADMIN', language: 'it' });
  await page.goto('/settings');
  await expect(page.getByText('Amministratore', { exact: true })).toBeVisible();
  await page.getByLabel('Lingua').selectOption('en');
  await expect(page.getByText('Administrator', { exact: true })).toBeVisible();
});
test('profile read, edit and cancel keep email readonly and discard the local draft', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/settings/profile');
  await expect(page.locator('main input')).toHaveCount(0);
  const edit = page.getByRole('button', { name: 'Edit personal information' });
  await expect(edit).toHaveAttribute('title', 'Edit personal information');
  await edit.click();
  await expect(page.getByLabel('First name')).toBeFocused();
  await page.getByLabel('First name').fill('Different');
  await page.getByLabel('Last name').fill('Person');
  await expect(page.getByRole('textbox')).toHaveCount(2);
  await expect(page.locator('input[type=email]')).toHaveCount(0);
  await expect(page.getByText('ada@example.com', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(edit).toBeFocused();
  await expect(page.getByText('Ada', { exact: true })).toBeVisible();
  await edit.click();
  await expect(page.getByLabel('First name')).toHaveValue('Ada');
  expect(state.requests.filter((r) => r.operationName === 'UpdateProfile')).toHaveLength(0);
});
test('profile validates names and saves normalized data once, updating toolbar and summary', async ({
  page,
}) => {
  const state = await setup(page, { holdProfile: true });
  await page.goto('/settings/profile');
  await page.getByRole('button', { name: 'Edit personal information' }).click();
  await page.getByLabel('First name').fill(' \t ');
  await page.getByLabel('Last name').fill('x'.repeat(101));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(2);
  expect(state.requests.filter((r) => r.operationName === 'UpdateProfile')).toHaveLength(0);
  await page.getByLabel('First name').fill('  aDa   Maria ');
  await page.getByLabel('Last name').fill('  De   Rossi ');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await page.keyboard.press('Enter');
  state.releaseProfile();
  await expect(page.getByRole('button', { name: 'Edit personal information' })).toBeVisible();
  await expect(page.getByText('aDa Maria', { exact: true })).toBeVisible();
  expect(state.requests.filter((r) => r.operationName === 'UpdateProfile')).toEqual([
    {
      operationName: 'UpdateProfile',
      variables: { input: { firstName: 'aDa Maria', lastName: 'De Rossi' } },
    },
  ]);
  await page.getByRole('button', { name: 'User menu' }).click();
  await expect(page.locator('#user-menu strong')).toHaveText('aDa Maria De Rossi');
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'aDa Maria De Rossi' })).toBeVisible();
});
for (const code of ['VALIDATION_ERROR', 'INTERNAL_SERVER_ERROR']) {
  test(`profile ${code} failure preserves draft and supports localized retry`, async ({ page }) => {
    const state = await setup(page, { profileFailure: code });
    await page.goto('/settings/profile');
    await page.getByRole('button', { name: 'Edit personal information' }).click();
    await page.getByLabel('First name').fill('New Name');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(
      code === 'VALIDATION_ERROR' ? 'Check your' : 'could not save',
    );
    await expect(page.getByLabel('First name')).toHaveValue('New Name');
    await expect(page.getByRole('alert')).not.toContainText('Private');
    await page.getByLabel('Language').selectOption('it');
    await expect(page.getByRole('alert')).toContainText(
      code === 'VALIDATION_ERROR' ? 'Controlla' : 'Non è stato possibile',
    );
    state.setProfileFailure('');
    await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await expect(page.getByText('New Name', { exact: true })).toBeVisible();
  });
}
test('deleted list shows only server results, UTC dates and readonly cards', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/settings/deleted-vehicles');
  const article = page.getByRole('article');
  await expect(article).toHaveCount(1);
  await expect(article.getByRole('heading', { name: 'Ford Fiesta' })).toBeVisible();
  await expect(article).toContainText('AB123CD · 2011');
  await expect(article.locator('time').nth(0)).toHaveText('Oct 10, 2026');
  await expect(article.locator('time').nth(1)).toHaveText('Nov 6, 2026');
  await expect(article.getByRole('link')).toHaveCount(0);
  await expect(page.getByText('Toyota Yaris', { exact: true })).toHaveCount(0);
  expect(state.requests.find((r) => r.operationName === 'DeletedVehicles')?.variables).toEqual({});
  await page.getByLabel('Language').selectOption('it');
  await expect(article.locator('time').nth(0)).toHaveText('10 ott 2026');
  await expect(page.getByRole('button', { name: 'Ripristina veicolo' })).toBeVisible();
});
test('deleted vehicles loading, localized query failure and retry', async ({ page }) => {
  const state = await setup(page, { holdList: true, listFailure: true });
  await page.goto('/settings/deleted-vehicles');
  await expect(page.getByRole('status')).toHaveText('Loading deleted vehicles…');
  await expect(page.getByRole('article')).toHaveCount(0);
  state.releaseList();
  await expect(page.getByRole('alert')).toContainText('could not load');
  await expect(page.getByRole('alert')).not.toContainText('Private');
  state.setListFailure(false);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
});
test('empty recovery list is localized and provides compact back navigation', async ({ page }) => {
  await setup(page, { empty: true, language: 'it' });
  await page.goto('/settings/deleted-vehicles');
  await expect(page.getByText('Non ci sono veicoli eliminati da recuperare.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ripristina veicolo' })).toHaveCount(0);
  await page.getByLabel('Lingua').selectOption('en');
  await expect(
    page.getByText('There are no deleted vehicles available for recovery.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to settings' })).toHaveAttribute(
    'title',
    'Back to settings',
  );
});
test('restore dialog cancels with focus restoration and Escape without a mutation', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/settings/deleted-vehicles');
  const trigger = page.getByRole('button', { name: 'Restore vehicle', exact: true });
  const dialog = await openRestore(page);
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await expect(dialog).toContainText('Ford Fiesta and all its maintenance events');
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await openRestore(page);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(state.requests.filter((r) => r.operationName === 'RestoreVehicle')).toHaveLength(0);
});
test('successful restoration refreshes deleted list and cached garage without reload or navigation', async ({
  page,
}) => {
  const state = await setup(page, { holdRestore: true });
  await page.goto('/home');
  await expect(page.getByRole('link', { name: /Toyota Yaris/ })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.navigationMarker = 'same-document';
  });
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: 'Deleted vehicles' }).click();
  const dialog = await openRestore(page);
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Restoring…' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Enter');
  state.releaseRestore();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/settings\/deleted-vehicles$/);
  await expect(
    page.getByText('Vehicle restored. It is available in your garage again.'),
  ).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(
    page.getByText('There are no deleted vehicles available for recovery.'),
  ).toBeVisible();
  expect(state.requests.filter((r) => r.operationName === 'RestoreVehicle')).toEqual([
    { operationName: 'RestoreVehicle', variables: { id: 'deleted' } },
  ]);
  expect(state.requests.filter((r) => r.operationName === 'DeletedVehicles')).toHaveLength(2);
  await page.getByRole('link', { name: 'Back to settings' }).click();
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await page.getByLabel('Choose vehicle').selectOption('deleted');
  await expect(page.getByRole('link', { name: /Ford Fiesta/ })).toBeVisible();
  await expect(page.getByText('Preserved oil change', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add maintenance event' })).toHaveAttribute(
    'href',
    '/maintenance-events/new?vehicleId=deleted',
  );
  expect(state.requests.filter((r) => r.operationName === 'Vehicles')).toHaveLength(2);
  expect(await page.evaluate(() => document.documentElement.dataset.navigationMarker)).toBe(
    'same-document',
  );
  await page.getByRole('link', { name: /Ford Fiesta/ }).click();
  await expect(page.getByRole('heading', { name: 'Ford Fiesta' })).toBeVisible();
});
for (const code of ['VEHICLE_NOT_FOUND', 'INTERNAL_SERVER_ERROR']) {
  test(`restore ${code} handles expired/unavailable records without removing the card`, async ({
    page,
  }) => {
    const state = await setup(page, { restoreFailure: code });
    await page.goto('/settings/deleted-vehicles');
    const dialog = await openRestore(page);
    await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(
      code === 'VEHICLE_NOT_FOUND' ? 'unavailable for recovery' : 'could not restore',
    );
    await expect(dialog.getByRole('alert')).not.toContainText('Private');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page).toHaveURL(/\/settings\/deleted-vehicles$/);
    state.setRestoreFailure('');
    await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(0);
  });
}
test('Italian settings, profile labels and restoration confirmation update normally', async ({
  page,
}) => {
  await setup(page, { language: 'it' });
  await page.goto('/settings');
  await page.getByRole('link', { name: 'Informazioni personali' }).click();
  await page.getByRole('button', { name: 'Modifica informazioni personali' }).click();
  await expect(page.getByLabel('Nome', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Cognome')).toBeVisible();
  await page.getByRole('button', { name: 'Annulla', exact: true }).click();
  await page.getByRole('link', { name: 'Torna alle impostazioni' }).click();
  await page.getByRole('link', { name: 'Veicoli eliminati' }).click();
  const dialog = await openRestore(page, true);
  await expect(dialog).toContainText('torneranno disponibili nel tuo garage');
  await dialog.getByRole('button', { name: 'Ripristina', exact: true }).click();
  await expect(
    page.getByText('Veicolo ripristinato. È di nuovo disponibile nel tuo garage.'),
  ).toBeVisible();
});
for (const width of [320, 375, 428, 768, 1280, 2560]) {
  test(`responsive settings, profile, cards and keyboard dialog at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await setup(page, { language: 'it' });
    await page.goto('/settings');
    const checkOverflow = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    await checkOverflow();
    if (width === 320 || width === 1280)
      await page.screenshot({ path: `/tmp/motory-settings-home-${width}.png`, fullPage: true });
    const main = await page.locator('main').boundingBox();
    expect(main!.width).toBeLessThanOrEqual(960);
    const entry = page.getByRole('link', { name: 'Informazioni personali' });
    await entry.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Modifica informazioni personali' }).click();
    await checkOverflow();
    if (width === 320 || width === 1280)
      await page.screenshot({ path: `/tmp/motory-settings-profile-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Annulla', exact: true }).click();
    await page.getByRole('link', { name: 'Torna alle impostazioni' }).click();
    await page.getByRole('link', { name: 'Veicoli eliminati' }).click();
    await checkOverflow();
    const dialog = await openRestore(page, true);
    await expect(dialog.getByRole('button', { name: 'Annulla' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Ripristina', exact: true })).toBeFocused();
    const bounds = await dialog.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(width - 32);
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    const actionBounds = await dialog
      .getByRole('button', { name: 'Ripristina', exact: true })
      .boundingBox();
    expect(actionBounds!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `/tmp/motory-settings-restore-${width}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Ripristina veicolo' })).toBeFocused();
  });
}

test('a delayed profile response cannot replace a newer authenticated session', async ({
  page,
}) => {
  const state = await setup(page, { holdProfile: true });
  await page.goto('/settings/profile');
  await page.getByRole('button', { name: 'Edit personal information' }).click();
  await page.getByLabel('First name').fill('Previous account');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  Object.assign(state.user, {
    id: 'new-owner',
    firstName: 'Bea',
    lastName: 'Bianchi',
    email: 'bea@example.com',
  });
  await page.evaluate(() => {
    localStorage.setItem('motory_access_token', 'new-session');
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'motory_access_token', newValue: 'new-session' }),
    );
  });
  await expect(page.getByText('Bea', { exact: true })).toBeVisible();
  const response = page.waitForResponse(
    (response) => response.request().postDataJSON()?.operationName === 'UpdateProfile',
  );
  state.releaseProfile();
  await (await response).finished();
  await page.getByRole('button', { name: 'User menu' }).click();
  await expect(page.locator('#user-menu strong')).toHaveText('Bea Bianchi');
  await expect(page.getByText('Previous account', { exact: true })).toHaveCount(0);
});

test('the browser clock does not decide recovery eligibility', async ({ page }) => {
  await setup(page);
  await page.clock.setFixedTime(new Date('2040-01-01T00:00:00.000Z'));
  await page.goto('/settings/deleted-vehicles');
  const dialog = await openRestore(page);
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(
    page.getByText('Vehicle restored. It is available in your garage again.'),
  ).toBeVisible();
});
