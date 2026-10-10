import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'en-GB', timezoneId: 'Europe/Rome' });
const id = '11111111-1111-4111-8111-111111111111';
const user = {
  id,
  firstName: 'Ada',
  lastName: 'Rossi',
  email: 'ada@example.com',
  createdAt: '2026-10-10T12:00:00Z',
  emailVerified: true,
  roles: ['USER', 'ADMIN'],
};
async function setup(
  page: Page,
  options: {
    role?: string;
    anonymous?: boolean;
    language?: string;
    empty?: boolean;
    fail?: string;
    hold?: boolean;
    verified?: boolean;
  } = {},
) {
  const state = {
    fail: options.fail ?? '',
    empty: options.empty ?? false,
    total: 41,
    hold: options.hold ?? false,
    requests: [] as { operationName: string; variables: Record<string, unknown> }[],
    release: () => {},
  };
  const gate = new Promise<void>((resolve) => {
    state.release = resolve;
  });
  await page.addInitScript(
    ({ anonymous, language }) => {
      if (!anonymous) localStorage.setItem('motory_access_token', 'admin-session');
      localStorage.setItem('motory_language', language);
    },
    { anonymous: !!options.anonymous, language: options.language ?? 'en' },
  );
  await page.route('**/graphql', async (route) => {
    const { operationName, variables } = route.request().postDataJSON();
    state.requests.push({ operationName, variables });
    if (operationName === 'Me') {
      await route.fulfill({
        json: {
          data: {
            me: {
              __typename: 'User',
              id: 'admin',
              firstName: 'Alex',
              lastName: 'Admin',
              email: 'alex@example.com',
              role: options.role ?? 'ADMIN',
            },
          },
        },
      });
      return;
    }
    if (!operationName.startsWith('Admin')) {
      await route.fulfill({
        json: { data: { vehicles: [], deletedVehicles: [], vehicleDeletionRetentionDays: 7 } },
      });
      return;
    }
    if (state.hold) await gate;
    if (state.fail === 'NETWORK') {
      await route.abort('failed');
      return;
    }
    if (state.fail) {
      await route.fulfill({
        json: {
          errors: [{ message: 'Private database details', extensions: { code: state.fail } }],
        },
      });
      return;
    }
    let data: object = {};
    if (operationName === 'AdminDashboard')
      data = {
        adminDashboard: {
          totalUsers: 12345,
          verifiedUsers: 11000,
          activeVehicles: 15000,
          deletedVehicles: 203,
          totalMaintenanceEvents: 50321,
          recentUsers: state.empty ? [] : [{ ...user, emailVerified: options.verified ?? true }],
        },
      };
    if (operationName === 'AdminUsers') {
      const totalCount =
        state.empty || variables.search === 'absent' ? 0 : variables.search ? 1 : state.total;
      const pageSize = variables.pageSize;
      const totalPages = Math.ceil(totalCount / pageSize);
      data = {
        adminUsers: {
          items:
            totalCount && variables.page <= totalPages
              ? [{ ...user, firstName: variables.search || `Page ${variables.page}` }]
              : [],
          totalCount,
          page: variables.page,
          pageSize,
          totalPages,
        },
      };
    }
    if (operationName === 'AdminUser')
      data = {
        adminUser: {
          ...user,
          id: variables.id,
          activity: {
            activeVehiclesCount: 2,
            deletedVehiclesCount: 1,
            totalMaintenanceEventsCount: 9,
          },
        },
      };
    await route.fulfill({ json: { data } });
  });
  return state;
}

for (const path of ['/admin', '/admin/users', `/admin/users/${id}`]) {
  test(`USER cannot render or query ${path}`, async ({ page }) => {
    const state = await setup(page, { role: 'USER' });
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    expect(state.requests.filter((r) => r.operationName.startsWith('Admin'))).toHaveLength(0);
    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(
      page.locator('#user-menu').getByRole('link', { name: 'Administration' }),
    ).toHaveCount(0);
    await expect(page.locator('#user-menu').getByRole('link', { name: 'Settings' })).toBeVisible();
    await page.getByLabel('Language').selectOption('it');
    await expect(page.getByRole('heading', { name: 'Accesso negato' })).toBeVisible();
  });
  test(`anonymous ${path} follows login redirect without admin queries`, async ({ page }) => {
    const state = await setup(page, { anonymous: true });
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    expect(state.requests).toHaveLength(0);
  });
}

test('admin menu navigates in the same document, closes and preserves settings/logout', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/settings');
  await page.evaluate(() => {
    document.documentElement.dataset.marker = 'retained';
  });
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.locator('#user-menu').getByRole('link', { name: 'Administration' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('#user-menu')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.marker)).toBe('retained');
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.locator('#user-menu').getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('overview renders five authoritative metrics, recent users and both navigation actions', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/admin');
  for (const label of [
    'Registered users',
    'Verified users',
    'Active vehicles',
    'Deleted vehicles',
    'Maintenance events',
  ])
    await expect(page.locator('dt', { hasText: label })).toBeVisible();
  await expect(page.locator('dd').first()).toHaveText('12,345');
  await expect(page.getByRole('link', { name: /Ada Rossi/ })).toContainText('Verified');
  await page.getByRole('link', { name: /Ada Rossi/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/admin/users/${id}$`));
  await expect(page.getByRole('heading', { name: 'Ada Rossi' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to users' }).click();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.getByRole('link', { name: 'View all' }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  expect(state.requests.filter((r) => r.operationName === 'AdminDashboard')).toHaveLength(2);
});

test('dashboard loading, empty and localized retry states', async ({ page }) => {
  const state = await setup(page, { hold: true, fail: 'INTERNAL_SERVER_ERROR' });
  await page.goto('/admin');
  await expect(page.getByRole('status')).toContainText('Loading administration');
  await expect(page.locator('.admin-skeleton')).toHaveCount(6);
  state.hold = false;
  state.release();
  await expect(page.getByRole('alert')).toContainText('could not load');
  await expect(page.getByRole('alert')).not.toContainText('Private');
  await page.getByLabel('Language').selectOption('it');
  await expect(page.getByRole('alert')).toContainText('Non è stato possibile');
  state.fail = '';
  state.empty = true;
  await page.getByRole('button', { name: 'Riprova' }).click();
  await expect(page.getByText('Non ci sono ancora utenti registrati.')).toBeVisible();
});

test('debounces trimmed server search, resets pagination and preserves search between pages', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/admin/users');
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
  await page.clock.install();
  const input = page.getByLabel('Search users');
  await input.fill(' A');
  await page.clock.runFor(100);
  await input.fill(' Ada ');
  await page.clock.runFor(299);
  expect(state.requests.filter((r) => r.operationName === 'AdminUsers')).toHaveLength(2);
  await expect(page.getByText('Page 2', { exact: true })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible();
  expect(state.requests.filter((r) => r.operationName === 'AdminUsers').at(-1)?.variables).toEqual({
    page: 1,
    pageSize: 20,
    search: 'Ada',
  });
  await expect(input).toHaveValue(' Ada ');
  await input.fill('');
  await page.clock.runFor(300);
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
  expect(
    state.requests.filter((r) => r.operationName === 'AdminUsers').at(-1)?.variables.search,
  ).toBe('');
});

test('pagination handles loading, empty search and shrinking result counts', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/admin/users');
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 3', { exact: true })).toBeVisible();
  state.total = 1;
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.getByLabel('Search users').fill('absent');
  await expect(page.getByText('No users found.')).toBeVisible();
  await expect(page.getByText('No pages', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Search users')).toHaveValue('absent');
});

test('late search results do not replace a newer search', async ({ page }) => {
  await setup(page);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON();
    if (body.operationName !== 'AdminUsers' || body.variables.search !== 'Old') {
      await route.fallback();
      return;
    }
    await gate;
    await route.fulfill({
      json: {
        data: {
          adminUsers: {
            items: [{ ...user, firstName: 'Old' }],
            totalCount: 1,
            page: 1,
            pageSize: 20,
            totalPages: 1,
          },
        },
      },
    });
  });
  await page.goto('/admin/users');
  await page.getByLabel('Search users').fill('Old');
  await expect(page.getByRole('status')).toBeVisible();
  await page.waitForRequest((req) => req.postDataJSON()?.variables?.search === 'Old');
  await page.getByLabel('Search users').fill('New');
  await expect(page.getByText('New Rossi', { exact: true }).first()).toBeVisible();
  release();
  await expect(page.getByText('Old Rossi', { exact: true })).toHaveCount(0);
});

for (const code of ['FORBIDDEN', 'USER_NOT_FOUND', 'INTERNAL_SERVER_ERROR']) {
  test(`details handles ${code} with back navigation and no stale account information`, async ({
    page,
  }) => {
    await setup(page, { fail: code });
    await page.goto(`/admin/users/${id}`);
    await expect(page.getByRole('alert')).toContainText(
      code === 'FORBIDDEN'
        ? 'permission'
        : code === 'USER_NOT_FOUND'
          ? 'unavailable'
          : 'could not load',
    );
    await expect(page.getByRole('heading', { name: 'Ada Rossi' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Back to users' })).toBeVisible();
    await expect(page.getByRole('alert')).not.toContainText('Private');
  });
}

test('details show account fields, multiple role indicators and numeric activity only, in both languages', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto(`/admin/users/${id}`);
  await expect(page.getByRole('heading', { name: 'Ada Rossi' })).toBeVisible();
  await expect(page.getByText('Administrator', { exact: true })).toBeVisible();
  await expect(page.getByText('User', { exact: true })).toBeVisible();
  await expect(page.locator('.admin-metric dd')).toHaveText(['2', '1', '9']);
  await expect(page.locator('time')).toHaveText('Oct 10, 2026');
  await expect(page.locator('main input, main button')).toHaveCount(0);
  await expect(page.locator('main a')).toHaveCount(1);
  await page.getByLabel('Language').selectOption('it');
  await expect(page.getByRole('heading', { name: 'Dettagli utente' })).toBeVisible();
  await expect(page.getByText('Amministratore', { exact: true })).toBeVisible();
  await expect(page.locator('time')).toHaveText('10 ott 2026');
  await expect(page.getByRole('link', { name: 'Torna agli utenti' })).toHaveAttribute(
    'title',
    'Torna agli utenti',
  );
  expect(state.requests.filter((r) => r.operationName === 'AdminUser')).toEqual([
    { operationName: 'AdminUser', variables: { id } },
  ]);
});

test('list errors retain search and recover without exposing server details', async ({ page }) => {
  const state = await setup(page, { fail: 'INTERNAL_SERVER_ERROR' });
  await page.goto('/admin/users');
  await expect(page.getByRole('alert')).toContainText('could not load');
  await expect(page.getByLabel('Search users')).toBeVisible();
  state.fail = '';
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
});

test('unverified status and menu entry translate between Italian and English', async ({ page }) => {
  await setup(page, { language: 'it', verified: false });
  await page.goto('/admin');
  await expect(page.getByText('Non verificata', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Menu utente' }).click();
  await expect(
    page.locator('#user-menu').getByRole('link', { name: 'Amministrazione' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('Lingua').selectOption('en');
  await expect(page.getByText('Not verified', { exact: true })).toBeVisible();
});

test('network failure and list loading show localized feedback and support retry', async ({
  page,
}) => {
  const state = await setup(page, { hold: true, fail: 'NETWORK' });
  await page.goto('/admin/users');
  await expect(page.getByRole('status')).toContainText('Loading administration');
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByLabel('Search users')).toBeEnabled();
  state.hold = false;
  state.release();
  await expect(page.getByRole('alert')).toContainText('could not load');
  state.fail = '';
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible();
});

for (const width of [320, 375, 428, 768, 1280, 2560]) {
  test(`responsive admin pages and single navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page, { language: 'it' });
    for (const path of ['/admin', '/admin/users', `/admin/users/${id}`]) {
      await page.goto(path);
      await expect(page.locator('.admin-panel').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(
        page.getByRole('navigation', { name: 'Navigazione amministrazione' }),
      ).toHaveCount(1);
      await expect(page.getByRole('banner')).toHaveCount(1);
      const layout = await page.locator('.admin-layout').boundingBox();
      expect(layout!.width).toBeLessThanOrEqual(1360);
      if (path === '/admin/users') {
        if (width >= 1280) await expect(page.getByRole('table')).toBeVisible();
        else {
          await expect(page.getByRole('table')).not.toBeVisible();
          await expect(page.getByRole('link', { name: /Page 1 Rossi/ })).toBeVisible();
        }
        expect(state.requests.filter((r) => r.operationName === 'AdminUsers')).toHaveLength(1);
      }
      if (width === 320 || width === 1280)
        await page.screenshot({
          path: `/tmp/motory-admin-${path === '/admin' ? 'overview' : path === '/admin/users' ? 'users' : 'detail'}-${width}.png`,
          fullPage: true,
        });
    }
  });
}
