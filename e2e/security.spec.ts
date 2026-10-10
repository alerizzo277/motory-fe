import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ locale: 'en-GB' });
async function setup(
  page: Page,
  options: { language?: string; failure?: string; hold?: boolean; clipboardFailure?: boolean } = {},
) {
  let failure = options.failure ?? '';
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requests: { operationName: string; variables: Record<string, unknown> }[] = [];
  await page.addInitScript(
    ({ language, clipboardFailure }) => {
      localStorage.setItem('motory_access_token', 'security-session');
      localStorage.setItem('motory_language', language);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            if (clipboardFailure) throw new Error('Clipboard blocked');
            Object.defineProperty(window, '__copiedPassword', { configurable: true, value: text });
          },
        },
      });
    },
    { language: options.language ?? 'en', clipboardFailure: options.clipboardFailure ?? false },
  );
  await page.route('**/graphql', async (route) => {
    const { operationName, variables } = route.request().postDataJSON();
    requests.push({ operationName, variables });
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
    if (operationName === 'Vehicles') data = { vehicles: [] };
    if (operationName === 'ChangePassword') {
      if (options.hold) await gate;
      if (failure) {
        await route.fulfill({
          json: {
            errors: [{ message: 'Private technical details', extensions: { code: failure } }],
          },
        });
        return;
      }
      data = { changePassword: true };
    }
    await route.fulfill({ json: { data } });
  });
  return {
    requests,
    release,
    setFailure(value: string) {
      failure = value;
    },
  };
}
async function fill(page: Page, current = 'old-password', next = 'abcdefgh', confirmation = next) {
  await page.getByLabel('Current password', { exact: true }).fill(current);
  await page.getByLabel('New password', { exact: true }).fill(next);
  await page.getByLabel('Confirm new password', { exact: true }).fill(confirmation);
}

test('security is protected and reachable from the settings lock entry', async ({ page }) => {
  await page.goto('/settings/security');
  await expect(page).toHaveURL(/\/login$/);
  await setup(page);
  await page.goto('/settings');
  const entry = page.getByRole('link', { name: 'Security and password', exact: true });
  await expect(entry.locator('svg')).toHaveCount(2);
  await entry.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/settings\/security$/);
  await expect(page.getByRole('heading', { name: 'Security and password' })).toBeVisible();
  await expect(page.getByLabel('Current password')).toHaveAttribute(
    'autocomplete',
    'current-password',
  );
  await expect(page.getByLabel('New password', { exact: true })).toHaveAttribute(
    'autocomplete',
    'new-password',
  );
  await expect(page.getByLabel('Confirm new password')).toHaveAttribute(
    'autocomplete',
    'new-password',
  );
  await page.getByRole('link', { name: 'Back to settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
test('inline validation covers required fields, minimum length, mismatch and unchanged password', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/settings/security');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(3);
  await fill(page, 'old-password', 'short', 'different');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.getByLabel('New password', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByText('The passwords do not match.', { exact: true })).toBeVisible();
  await fill(page, 'old-password', 'old-password');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(
    page.getByText('Choose a new password different from your current password.'),
  ).toBeVisible();
  expect(state.requests.filter((r) => r.operationName === 'ChangePassword')).toHaveLength(0);
});
test('every password visibility toggle has localized labels and keyboard access', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/settings/security');
  for (const field of ['Current password', 'New password', 'Confirm new password']) {
    const input = page.getByLabel(field, { exact: true });
    const toggle = input.locator('..').getByRole('button');
    await expect(input).toHaveAttribute('type', 'password');
    await expect(toggle).toHaveAttribute('title', 'Show password');
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(input).toHaveAttribute('type', 'text');
    await expect(toggle).toHaveAttribute('aria-label', 'Hide password');
    await toggle.click();
    await expect(input).toHaveAttribute('type', 'password');
  }
  await page.getByLabel('Language').selectOption('it');
  await expect(page.getByRole('button', { name: 'Mostra password', exact: true })).toHaveCount(3);
});
test('successful change sends exact passwords once, clears secrets and keeps the session', async ({
  page,
}) => {
  const state = await setup(page, { hold: true });
  await page.goto('/settings/security');
  await page.getByRole('button', { name: 'Generate password', exact: true }).click();
  await fill(page, ' old-password ', ' new-password ');
  for (const field of ['Current password', 'New password', 'Confirm new password'])
    await page.getByLabel(field, { exact: true }).locator('..').getByRole('button').click();
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Changing password…' })).toBeDisabled();
  await expect(page.getByLabel('Current password')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Use this password' })).toBeDisabled();
  await page.keyboard.press('Enter');
  state.release();
  await expect(page.getByRole('status')).toHaveText(
    'Password changed successfully. You are still signed in.',
  );
  await expect(page).toHaveURL(/\/settings\/security$/);
  for (const field of ['Current password', 'New password', 'Confirm new password']) {
    await expect(page.getByLabel(field, { exact: true })).toHaveValue('');
    await expect(page.getByLabel(field, { exact: true })).toHaveAttribute('type', 'password');
  }
  await expect(page.getByLabel('Generated password')).toHaveCount(0);
  expect(state.requests.filter((r) => r.operationName === 'ChangePassword')).toEqual([
    {
      operationName: 'ChangePassword',
      variables: { input: { currentPassword: ' old-password ', newPassword: ' new-password ' } },
    },
  ]);
  expect(await page.evaluate(() => localStorage.getItem('motory_access_token'))).toBe(
    'security-session',
  );
  await page.getByRole('button', { name: 'User menu' }).click();
  await expect(page.locator('#user-menu strong')).toHaveText('Ada Rossi');
});
for (const code of [
  'INVALID_CURRENT_PASSWORD',
  'PASSWORD_UNCHANGED',
  'VALIDATION_ERROR',
  'INTERNAL_SERVER_ERROR',
]) {
  test(`backend ${code} failure preserves context and supports retry`, async ({ page }) => {
    const state = await setup(page, { failure: code });
    await page.goto('/settings/security');
    await fill(page);
    await page.getByRole('button', { name: 'Change password', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(page.getByRole('alert')).not.toContainText('Private');
    await expect(page.getByLabel('Current password')).toHaveValue('old-password');
    await expect(page.getByLabel('New password', { exact: true })).toHaveValue('abcdefgh');
    await page.getByLabel('Language').selectOption('it');
    await expect(page.getByRole('alert')).toContainText(
      code === 'INVALID_CURRENT_PASSWORD'
        ? 'non è corretta'
        : code === 'PASSWORD_UNCHANGED'
          ? 'diversa'
          : code === 'VALIDATION_ERROR'
            ? 'Controlla'
            : 'Non è stato possibile',
    );
    state.setFailure('');
    await page.getByRole('button', { name: 'Modifica password', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('sessione rimane attiva');
  });
}
test('generator supports copy, regenerate and use without persisting or submitting', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/settings/security');
  await page.getByLabel('Current password').fill('existing-password');
  const storageBefore = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    cookies: document.cookie,
  }));
  await page.getByRole('button', { name: 'Generate password', exact: true }).click();
  const first = await page.getByLabel('Generated password').inputValue();
  expect(first).toHaveLength(16);
  for (const category of [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/])
    expect(first).toMatch(category);
  await page.getByRole('button', { name: 'Copy password', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Password copied.');
  expect(await page.evaluate(() => Reflect.get(window, '__copiedPassword'))).toBe(first);
  await page.getByRole('button', { name: 'Use this password', exact: true }).click();
  await expect(page.getByLabel('Current password')).toHaveValue('existing-password');
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue(first);
  await expect(page.getByLabel('Confirm new password')).toHaveValue(first);
  await expect(page.getByRole('status')).toContainText('Password copied to the clipboard');
  await page.getByRole('button', { name: 'Regenerate password', exact: true }).click();
  expect(await page.getByLabel('Generated password').inputValue()).not.toBe(first);
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue(first);
  const second = await page.getByLabel('Generated password').inputValue();
  await page.getByRole('button', { name: 'Use this password', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Password copied to the clipboard');
  expect(await page.evaluate(() => Reflect.get(window, '__copiedPassword'))).toBe(second);
  expect(state.requests.filter((r) => r.operationName === 'ChangePassword')).toHaveLength(0);
  expect(
    await page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookies: document.cookie,
    })),
  ).toEqual(storageBefore);
  await expect(page).toHaveURL(/\/settings\/security$/);
});
test('clipboard failure leaves generated password selectable with localized feedback', async ({
  page,
}) => {
  await setup(page, { clipboardFailure: true, language: 'it' });
  await page.goto('/settings/security');
  await page.getByRole('button', { name: 'Genera password', exact: true }).click();
  await page.getByRole('button', { name: 'Copia password', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Copia non riuscita. Seleziona la password e copiala manualmente.',
  );
  const input = page.getByLabel('Password generata');
  await input.evaluate((element: HTMLInputElement) => element.select());
  expect(
    await input.evaluate(
      (element: HTMLInputElement) => element.selectionEnd! - element.selectionStart!,
    ),
  ).toBe(16);
  await page.getByRole('button', { name: 'Usa questa password', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('ma la copia negli appunti non è riuscita');
  await expect(page.getByLabel('Nuova password', { exact: true })).toHaveValue(
    await input.inputValue(),
  );
  await page.getByLabel('Lingua').selectOption('en');
  await expect(page.getByRole('alert')).toContainText('copy it manually');
});
for (const width of [320, 375, 428, 768, 1280, 2560]) {
  test(`security form and generator stay usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await setup(page, { language: 'it' });
    await page.goto('/settings/security');
    await page.getByRole('button', { name: 'Genera password', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const toggle of await page
      .getByRole('button', { name: 'Mostra password', exact: true })
      .all()) {
      const bounds = await toggle.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: 'Usa questa password', exact: true }).click();
    await expect(page.getByLabel('Nuova password', { exact: true })).not.toHaveValue('');
    await page.screenshot({ path: `/tmp/motory-security-${width}.png`, fullPage: true });
  });
}
