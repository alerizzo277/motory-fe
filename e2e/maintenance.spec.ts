import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { MaintenanceEvent, MaintenanceInput } from '../src/features/maintenance-events/types';
test.use({ locale: 'en-GB' });
const vehicleId = 'b3c30c2b-992d-4a63-bd94-301ce68c4cff';
const categoryId = 'ac411c10-bbfe-42ef-a999-232163c72a13';
const categoryCodes = ['MAINTENANCE', 'REPLACEMENT', 'REPAIR', 'PAYMENT', 'INSPECTION', 'OTHER'];
const categories = categoryCodes.map((code, index) => ({
  __typename: 'Category',
  id: index === 0 ? categoryId : `category-${index}`,
  code,
}));
const initial: MaintenanceEvent = {
  id: 'event-1',
  vehicleId,
  categoryId,
  name: 'Oil Change',
  status: 'SCHEDULED',
  scheduledDate: '2020-01-01T00:00:00.000Z',
  scheduledOdometerKm: 1200,
  executionDate: null,
  odometerKm: null,
  cost: null,
  provider: null,
  notes: 'Original note',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};
interface MutationCall {
  operationName: string;
  input: Partial<MaintenanceInput> & { vehicleId?: string };
}
async function setup(
  page: Page,
  options: {
    failure?: string;
    language?: string;
    executed?: boolean;
    delay?: number;
    priorReading?: boolean;
  } = {},
) {
  let rows: MaintenanceEvent[] = [
    {
      ...initial,
      ...(options.executed
        ? {
            status: 'EXECUTED' as const,
            executionDate: '2020-02-01T00:00:00.000Z',
            cost: '10.00',
            odometerKm: 1500,
          }
        : {}),
    },
  ];
  if (options.priorReading)
    rows.push(
      {
        ...initial,
        id: 'older-event',
        name: 'Earlier service',
        status: 'EXECUTED',
        executionDate: '2020-01-01T00:00:00.000Z',
        odometerKm: 1000,
      },
      {
        ...initial,
        id: 'follow-up',
        name: 'Next service',
        scheduledDate: null,
        scheduledOdometerKm: 1400,
      },
    );
  const mutations: MutationCall[] = [];
  const queries: string[] = [];
  let failure = options.failure ?? '';
  await page.addInitScript((language) => {
    localStorage.setItem('motory_access_token', 'session');
    localStorage.setItem('motory_language', language);
  }, options.language ?? 'en');
  const serialize = (row: MaintenanceEvent) => ({ ...row, __typename: 'MaintenanceEvent' });
  await page.route('**/graphql', async (route) => {
    const { operationName, variables } = route.request().postDataJSON() as {
      operationName: string;
      variables: { id?: string; vehicleId?: string; input?: MutationCall['input'] };
    };
    queries.push(operationName);
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
    const actualEvents = rows
      .filter((row) => row.status === 'EXECUTED' && row.odometerKm !== null)
      .sort((a, b) => (b.executionDate ?? '').localeCompare(a.executionDate ?? ''));
    const vehicle = {
      __typename: 'Vehicle',
      id: vehicleId,
      brand: 'Ford',
      model: 'Fiesta',
      year: 2020,
      licensePlate: 'AB123CD',
      fuelType: 'PETROL',
      latestOdometerKm: actualEvents[0]?.odometerKm ?? null,
    };
    if (operationName === 'Vehicle') {
      if (variables.id === vehicleId) data = { vehicle };
      else code = 'VEHICLE_NOT_FOUND';
    }
    if (operationName === 'Vehicles') data = { vehicles: [vehicle] };
    if (operationName === 'MaintenanceEvents')
      data = {
        maintenanceEvents: rows
          .filter((row) => row.vehicleId === variables.vehicleId)
          .map(serialize),
      };
    if (operationName === 'Categories') data = { categories };
    if (operationName === 'MaintenanceEvent') {
      const event = rows.find((row) => row.id === variables.id);
      if (event) data = { maintenanceEvent: serialize(event) };
      else code = 'MAINTENANCE_EVENT_NOT_FOUND';
    }
    if (operationName === 'DeleteMaintenanceEvent') {
      mutations.push({ operationName, input: {} });
      if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay));
      if (failure) code = failure;
      else {
        rows = rows.filter((row) => row.id !== variables.id);
        data = { deleteMaintenanceEvent: true };
      }
    }
    if (operationName === 'CreateMaintenanceEvent' || operationName === 'UpdateMaintenanceEvent') {
      const input = variables.input ?? {};
      mutations.push({ operationName, input });
      if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay));
      if (failure) code = failure;
      else {
        const { nextScheduledEvent: next, ...main } = input;
        const previous =
          operationName === 'UpdateMaintenanceEvent'
            ? rows.find((row) => row.id === variables.id)
            : undefined;
        const event: MaintenanceEvent = {
          ...initial,
          scheduledDate: null,
          scheduledOdometerKm: null,
          notes: null,
          ...previous,
          ...main,
          id: previous?.id ?? 'created-event',
        };
        for (const name of ['scheduledDate', 'executionDate'] as const)
          if (event[name] && event[name].length === 10) event[name] += 'T00:00:00.000Z';
        if (event.cost !== null) {
          const [integer, decimal = ''] = event.cost.split('.');
          event.cost = `${integer}.${decimal.padEnd(2, '0')}`;
        }
        const nextEvent: MaintenanceEvent | null = next
          ? {
              ...initial,
              ...next,
              id: 'next-event',
              vehicleId: event.vehicleId,
              status: 'SCHEDULED',
              scheduledDate: next.scheduledDate ? next.scheduledDate + 'T00:00:00.000Z' : null,
              executionDate: null,
              odometerKm: null,
              cost: null,
              provider: null,
            }
          : null;
        rows = [
          ...rows.filter((row) => row.id !== event.id),
          event,
          ...(nextEvent ? [nextEvent] : []),
        ];
        data = {
          [operationName === 'CreateMaintenanceEvent'
            ? 'createMaintenanceEvent'
            : 'updateMaintenanceEvent']: {
            __typename: 'MaintenanceEventPayload',
            event: serialize(event),
            nextScheduledEvent: nextEvent ? serialize(nextEvent) : null,
          },
        };
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
                    ? { fields: [{ field: 'name', messages: ['private'] }] }
                    : {}),
                },
              },
            ],
          }
        : { data },
    });
  });
  return {
    mutations,
    queries,
    setFailure: (value: string) => {
      failure = value;
    },
    rows: () => rows,
  };
}
async function newEvent(page: Page) {
  await page.goto(`/maintenance-events/new?vehicleId=${vehicleId}`);
  await expect(page.getByRole('heading', { name: 'Add maintenance event' })).toBeVisible();
}
async function fillCommon(page: Page) {
  await page.locator('#event-name').fill('  Oil   Change ');
  await page.locator('#event-categoryId').selectOption(categoryId);
}
async function executedForm(page: Page) {
  await fillCommon(page);
  await page.getByRole('radio', { name: 'Executed', exact: true }).check();

  await page.locator('#event-executionDate').fill('2020-02-01');
}

test('protected create/detail routes and unavailable vehicle/event states', async ({ page }) => {
  await setup(page);
  await newEvent(page);
  await page.goto('/maintenance-events/new');
  await expect(page.getByRole('alert')).toContainText('Vehicle not found or unavailable');
  await page.goto('/maintenance-events/new?vehicleId=missing');
  await expect(page.getByRole('alert')).toHaveText('This resource is unavailable.');
  await page.goto('/maintenance-events/missing');
  await expect(page.getByRole('alert')).toHaveText('This resource is unavailable.');
  await page.addInitScript(() => localStorage.removeItem('motory_access_token'));
  for (const path of [
    `/maintenance-events/new?vehicleId=${vehicleId}`,
    '/maintenance-events/event-1',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/login$/);
  }
});
for (const deadline of ['date', 'mileage', 'both']) {
  test(`creates a scheduled event with ${deadline}`, async ({ page }) => {
    const { mutations } = await setup(page);
    await newEvent(page);
    await fillCommon(page);
    if (deadline !== 'mileage') await page.locator('#event-scheduledDate').fill('2020-01-01');
    if (deadline !== 'date') await page.locator('#event-scheduledOdometerKm').fill('1200');
    await expect(page.locator('#event-executionDate')).toHaveCount(0);
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page).toHaveURL(/maintenance-events\/created-event$/);
    await expect(page.getByRole('heading', { name: 'Oil Change', exact: true })).toBeVisible();
    expect(mutations).toHaveLength(1);
    expect(mutations[0].input).toMatchObject({
      vehicleId,
      name: 'Oil Change',
      categoryId,
      status: 'SCHEDULED',
      executionDate: null,
      odometerKm: null,
      cost: null,
      provider: null,
    });
    expect(mutations[0].input).not.toHaveProperty('nextScheduledEvent');
  });
}
test('validates required common fields, scheduling conditions, mileage and executed fields', async ({
  page,
}) => {
  const { mutations } = await setup(page);
  await newEvent(page);
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.getByText('This field is required.')).toHaveCount(2);
  await expect(
    page.getByText('Enter at least a scheduled date or scheduled mileage.'),
  ).toBeVisible();
  await fillCommon(page);
  await page.locator('#event-scheduledOdometerKm').fill('1.5');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.getByText('Enter a whole number from 0 to 2,147,483,647.')).toBeVisible();
  await page.locator('#event-scheduledOdometerKm').fill('');
  await page.getByRole('radio', { name: 'Executed', exact: true }).check();
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.locator('#event-executionDate')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#event-executionDate').fill('2099-01-01');
  await page.locator('#event-cost').fill('1,001');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page.getByText('Execution date cannot be in the future.')).toBeVisible();
  await expect(page.locator('#event-cost')).toHaveAttribute('aria-invalid', 'true');
  expect(mutations).toHaveLength(0);
});
test('creates executed events without rescheduling and normalizes exact money', async ({
  page,
}) => {
  const { mutations } = await setup(page);
  await newEvent(page);
  await executedForm(page);
  await page.locator('#event-cost').fill('1234567890,12');
  await page.locator('#event-provider').fill('  My   Garage ');
  await page.locator('#event-notes').fill('  first\n  second  ');
  await expect(
    page.getByRole('checkbox', { name: 'Schedule another maintenance event' }),
  ).not.toBeChecked();
  await expect(page.locator('#next-name')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page).toHaveURL(/created-event$/);
  expect(mutations[0].input).toMatchObject({
    status: 'EXECUTED',
    executionDate: '2020-02-01',
    cost: '1234567890.12',
    provider: 'My   Garage',
    notes: 'first\n  second',
  });
  expect(mutations[0].input).not.toHaveProperty('nextScheduledEvent');
});
test('status switching clears stale execution values and optional next submission', async ({
  page,
}) => {
  const { mutations } = await setup(page);
  await newEvent(page);
  await executedForm(page);
  await page.locator('#event-cost').fill('10.00');
  await page.locator('#event-odometerKm').fill('1200');
  await page.getByRole('checkbox', { name: 'Schedule another maintenance event' }).check();
  await page.getByRole('radio', { name: 'Scheduled', exact: true }).check();
  await page.locator('#event-scheduledDate').fill('2020-01-01');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page).toHaveURL(/created-event$/);
  expect(mutations[0].input).toMatchObject({
    status: 'SCHEDULED',
    executionDate: null,
    odometerKm: null,
    cost: null,
    provider: null,
  });
  expect(mutations[0].input).not.toHaveProperty('nextScheduledEvent');
});
test('categories come from GraphQL, popover opens by keyboard and closes with Escape/outside', async ({
  page,
}) => {
  const { queries } = await setup(page);
  await newEvent(page);
  expect(queries).toContain('Categories');
  await expect(page.locator('#event-categoryId option')).toHaveCount(7);
  await expect(
    page.locator('#event-categoryId option', { hasText: 'Replacement' }),
  ).toHaveAttribute('value', 'category-1');
  const help = page.getByRole('button', { name: 'About categories', exact: true });
  await help.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'About categories' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog).toBeFocused();
  await expect(
    dialog.getByText('Vehicle-related payments, such as road tax and insurance.'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(help).toBeFocused();
  await help.click();
  await page.getByRole('heading', { name: 'Add maintenance event' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel('Language').selectOption('it');
  await expect(
    page.locator('#event-categoryId option', { hasText: 'Manutenzione' }),
  ).toBeAttached();
  await page.getByRole('button', { name: 'Informazioni sulle categorie' }).click();
  await expect(
    page.getByText('Pagamenti legati al veicolo, come bollo e assicurazione.'),
  ).toBeVisible();
});
test('read mode is text, edit/cancel/save retain URL and updates omit untouched fields', async ({
  page,
}) => {
  const { mutations } = await setup(page);
  await page.goto('/maintenance-events/event-1');
  await expect(page.locator('main input')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Oil Change' })).toBeVisible();
  const edit = page.getByRole('button', { name: 'Edit', exact: true });
  await expect(edit).toHaveAttribute('title', 'Edit');
  await edit.click();
  await page.locator('#event-name').fill('Discard');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Oil Change' })).toBeVisible();
  await edit.click();
  await page.locator('#event-name').fill('  New   name ');
  await page.locator('#event-notes').fill('');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New name' })).toBeVisible();
  await expect(page.locator('main input')).toHaveCount(0);
  await expect(page).toHaveURL(/event-1$/);
  expect(mutations).toEqual([
    { operationName: 'UpdateMaintenanceEvent', input: { name: 'New name', notes: null } },
  ]);
});
test('completion prepares execution fields and can be cancelled without a mutation', async ({
  page,
}) => {
  const { mutations } = await setup(page);
  await page.goto('/maintenance-events/event-1');
  await page.getByRole('button', { name: 'Mark as completed', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Executed', exact: true })).toBeChecked();
  await expect(page.locator('#event-executionDate')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Original plan' })).toBeVisible();
  await expect(page.getByText('1,200 km')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark as completed', exact: true })).toBeVisible();
  expect(mutations).toHaveLength(0);
});
for (const reschedule of [false, true]) {
  test(`completes an event with rescheduling=${reschedule} using one mutation`, async ({
    page,
  }) => {
    const { mutations, queries, rows } = await setup(page);
    await page.goto('/maintenance-events/event-1');
    await page.getByRole('button', { name: 'Mark as completed', exact: true }).click();
    await expect(page.locator('#event-executionDate')).toBeFocused();
    await page.locator('#event-executionDate').fill('2020-02-01');
    await page.locator('#event-odometerKm').fill('1500');
    if (reschedule) {
      await page.getByRole('checkbox', { name: 'Schedule another maintenance event' }).check();
      await expect(page.locator('#next-name')).toHaveValue('Oil Change');
      await expect(page.locator('#next-categoryId')).toHaveValue(categoryId);
      await expect(page.locator('#next-scheduledDate')).toHaveValue('');
      await expect(page.locator('#next-scheduledOdometerKm')).toHaveValue('');
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await expect(
        page.getByText('Enter at least a scheduled date or scheduled mileage.'),
      ).toBeVisible();
      expect(mutations).toHaveLength(0);
      await page.locator('#next-scheduledOdometerKm').fill('25000');
    }
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    expect(mutations).toHaveLength(1);
    expect(mutations[0].input).toMatchObject({
      status: 'EXECUTED',
      executionDate: '2020-02-01',
      odometerKm: 1500,
    });
    expect(mutations[0].input).not.toHaveProperty('scheduledDate');
    expect(mutations[0].input).not.toHaveProperty('scheduledOdometerKm');
    if (reschedule)
      expect(mutations[0].input.nextScheduledEvent).toEqual({
        name: 'Oil Change',
        categoryId,
        scheduledDate: null,
        scheduledOdometerKm: 25000,
        notes: null,
      });
    else expect(mutations[0].input).not.toHaveProperty('nextScheduledEvent');
    expect(rows()).toHaveLength(reschedule ? 2 : 1);
    await expect(page.getByRole('heading', { name: 'Original plan' })).toBeVisible();
    await expect(page.getByText('January 1, 2020')).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Scheduled', exact: true })).toHaveCount(0);
    await page.locator('#event-provider').fill('Garage');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    expect(mutations[1].input).toEqual({ provider: 'Garage' });
    expect(rows()).toHaveLength(reschedule ? 2 : 1);
    await page.getByRole('link', { name: 'Back to home', exact: true }).click();
    await expect(page).toHaveURL(/home$/);
    await expect(page.getByRole('heading', { name: 'Ford Fiesta', exact: true })).toBeVisible();
    await expect(page.getByText('1,500 km').first()).toBeVisible();
    expect(queries).toContain('Vehicles');
    const upcoming = page.getByRole('region', { name: 'Scheduled maintenance' });
    const recent = page.getByRole('region', { name: 'Completed maintenance' });
    await expect(recent.getByRole('link', { name: 'View Oil Change' })).toBeVisible();
    await expect(upcoming.getByRole('link')).toHaveCount(reschedule ? 1 : 0);
    if (reschedule) await expect(upcoming.getByText('25,000 km')).toBeVisible();
  });
}
test('creates executed and next events together without navigating to next event', async ({
  page,
}) => {
  const { mutations, rows } = await setup(page);
  await newEvent(page);
  await executedForm(page);
  await page.getByRole('checkbox', { name: 'Schedule another maintenance event' }).check();
  await page.locator('#next-name').fill('Next tyres');
  await page.locator('#next-categoryId').selectOption('category-1');
  await page.locator('#next-scheduledDate').fill('2021-01-01');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page).toHaveURL(/created-event$/);
  expect(mutations).toHaveLength(1);
  expect(mutations[0].input.nextScheduledEvent).toEqual({
    name: 'Next tyres',
    categoryId: 'category-1',
    scheduledDate: '2021-01-01',
    scheduledOdometerKm: null,
    notes: null,
  });
  expect(rows().find((row) => row.id === 'next-event')).toMatchObject({
    vehicleId,
    status: 'SCHEDULED',
  });
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Completed maintenance' })
      .getByRole('link', { name: 'View Oil Change' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Scheduled maintenance' })
      .getByRole('link', { name: 'View Next tyres' }),
  ).toBeVisible();
});
for (const code of ['VALIDATION_ERROR', 'INTERNAL_SERVER_ERROR']) {
  test(`${code} preserves both drafts and never displays backend messages`, async ({ page }) => {
    const state = await setup(page, { failure: code });
    await newEvent(page);
    await executedForm(page);
    await page.getByRole('checkbox', { name: 'Schedule another maintenance event' }).check();
    await page.locator('#next-name').fill('My next event');
    await page.locator('#next-scheduledOdometerKm').fill('25000');
    await page.locator('#next-notes').fill('Keep this next note');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page.getByRole('alert').last()).toBeVisible();
    await expect(page.locator('#event-name')).toHaveValue('  Oil   Change ');
    await expect(page.locator('#event-executionDate')).toHaveValue('2020-02-01');
    await expect(page.locator('#next-name')).toHaveValue('My next event');
    await expect(page.locator('#next-notes')).toHaveValue('Keep this next note');
    await expect(page.getByText('Private technical detail')).toHaveCount(0);
    state.setFailure('');
    await page.getByRole('button', { name: 'Save event', exact: true }).click();
    await expect(page).toHaveURL(/created-event$/);
  });
}
test('failed completion keeps the main and next drafts in edit mode', async ({ page }) => {
  const { mutations } = await setup(page, { failure: 'INTERNAL_SERVER_ERROR' });
  await page.goto('/maintenance-events/event-1');
  await page.getByRole('button', { name: 'Mark as completed', exact: true }).click();
  await expect(page.locator('#event-executionDate')).toBeFocused();
  await page.locator('#event-executionDate').fill('2020-02-01');
  await page.getByRole('checkbox', { name: 'Schedule another maintenance event' }).check();
  await page.locator('#next-name').fill('Next draft');
  await page.locator('#next-scheduledDate').fill('2021-01-01');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert').last()).toBeVisible();
  await expect(page.locator('#event-executionDate')).toHaveValue('2020-02-01');
  await expect(page.locator('#next-name')).toHaveValue('Next draft');
  await expect(page.getByRole('heading', { name: 'Original plan' })).toBeVisible();
  expect(mutations).toHaveLength(1);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark as completed', exact: true })).toBeVisible();
});
test('saving invalidates cached dashboard and vehicle mileage', async ({ page }) => {
  const { queries } = await setup(page);
  await page.goto('/maintenance-events/event-1');
  await expect(page.getByRole('button', { name: 'Mark as completed', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page).toHaveURL(/home$/);
  await expect(page.getByText('Mileage unavailable')).toBeVisible();
  await page.getByRole('link', { name: /Ford (Fiesta|Focus)/ }).click();
  await expect(page).toHaveURL(/vehicles\//);
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await expect(page.getByText('Mileage unavailable')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/home$/);
  await page.goBack();
  await expect(page).toHaveURL(/maintenance-events\/event-1$/);
  await page.getByRole('button', { name: 'Mark as completed', exact: true }).click();
  await expect(page.locator('#event-executionDate')).toBeFocused();
  await page.locator('#event-executionDate').fill('2020-02-01');
  await page.locator('#event-odometerKm').fill('1500');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page).toHaveURL(/home$/);
  await expect(page.getByRole('heading', { name: 'Ford Fiesta', exact: true })).toBeVisible();
  await expect(page.getByText('1,500 km').first()).toBeVisible();
  expect(queries.filter((query) => query === 'Vehicles')).toHaveLength(2);
  await page.getByRole('link', { name: /Ford (Fiesta|Focus)/ }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await expect(page.getByText('1,500 km').first()).toBeVisible();
  expect(queries.filter((query) => query === 'Vehicle')).toHaveLength(2);
});
test('unsaved changes are protected and duplicate submission is prevented', async ({ page }) => {
  const { mutations } = await setup(page, { delay: 350 });
  await newEvent(page);
  await fillCommon(page);
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#event-name')).toHaveValue('  Oil   Change ');
  await page.locator('#event-scheduledDate').fill('2020-01-01');
  await page.getByRole('button', { name: 'Save event', exact: true }).dblclick();
  await expect(page).toHaveURL(/created-event$/);
  expect(mutations).toHaveLength(1);
});
test('English and Italian labels, tooltips and validation change with language', async ({
  page,
}) => {
  await setup(page, { language: 'it' });
  await page.goto(`/maintenance-events/new?vehicleId=${vehicleId}`);
  await expect(page.getByRole('heading', { name: 'Aggiungi un intervento' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Programmato' })).toBeChecked();
  await expect(page.getByRole('link', { name: 'Torna alla home', exact: true })).toHaveAttribute(
    'title',
    'Torna alla home',
  );
  await page.getByRole('button', { name: 'Salva intervento', exact: true }).click();
  await expect(page.getByText('Questo campo è obbligatorio.')).toHaveCount(2);
  await page.getByLabel('Lingua').selectOption('en');
  await expect(page.getByText('This field is required.')).toHaveCount(2);
  await expect(page.getByRole('radio', { name: 'Executed', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Executed', exact: true }).check();
  await expect(page.getByRole('heading', { name: 'Schedule next maintenance' })).toBeVisible();
});
test('localized loading, network recovery and authentication errors', async ({ page }) => {
  await setup(page);
  let release: (() => void) | undefined;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/graphql', async (route) => {
    if (route.request().postDataJSON().operationName !== 'MaintenanceEvent')
      return route.fallback();
    await wait;
    await route.abort('failed');
  });
  await page.goto('/maintenance-events/event-1');
  await expect(page.getByRole('status')).toHaveText('Loading maintenance…');
  release?.();
  await expect(page.getByRole('alert')).toHaveText(
    'We could not load or save the maintenance event. Please try again.',
  );
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.unroute('**/graphql');
  await page.route('**/graphql', (route) =>
    route.fulfill({
      json: { errors: [{ message: 'private', extensions: { code: 'UNAUTHENTICATED' } }] },
    }),
  );
  await page.goto('/maintenance-events/event-1');
  await expect(page).toHaveURL(/login$/);
});
for (const width of [320, 375, 428, 768, 1280]) {
  test(`mobile/read/edit/reschedule/popover layouts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto('/maintenance-events/event-1');
    const back = page.getByRole('link', { name: 'Back to home', exact: true });
    const edit = page.getByRole('button', { name: 'Edit', exact: true });
    await expect(edit).toBeVisible();
    for (const action of [back, edit]) {
      const box = await action.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await back.focus();
    await expect(back).toBeFocused();
    await page.screenshot({
      path: `/private/tmp/motory-maintenance-read-${width}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Mark as completed', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Schedule another maintenance event' }).check();
    for (const lang of ['en', 'it']) {
      await page.locator('.app-toolbar__language select').selectOption(lang);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.locator('.category-information button').first().click();
      const box = await page.getByRole('dialog').boundingBox();
      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page
        .getByRole('dialog')
        .screenshot({ path: `/private/tmp/motory-maintenance-popover-${lang}-${width}.png` });
      await page.keyboard.press('Escape');
    }
    await page.screenshot({
      path: `/private/tmp/motory-maintenance-form-${width}.png`,
      fullPage: true,
    });
    const input = await page.locator('#next-categoryId').boundingBox();
    expect(input?.height).toBeGreaterThanOrEqual(44);
  });
}

test('dashboard FAB creation and ordinary edits refresh scheduled cards', async ({ page }) => {
  await setup(page);
  await page.goto('/home');
  await expect(page.getByRole('link', { name: 'View Oil Change' })).toBeVisible();
  await page.getByRole('link', { name: 'Add maintenance event', exact: true }).click();
  await page.locator('#event-name').fill('New intervention');
  await page.locator('#event-categoryId').selectOption(categoryId);
  await page.locator('#event-scheduledOdometerKm').fill('45000');
  await page.getByRole('button', { name: 'Save event', exact: true }).click();
  await expect(page).toHaveURL(/maintenance-events\/created-event$/);
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View New intervention' })).toBeVisible();
  await page.getByRole('link', { name: 'View New intervention' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#event-name').fill('Renamed intervention');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View Renamed intervention' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View New intervention' })).toHaveCount(0);
});

for (const executed of [false, true]) {
  test(`deletes ${executed ? 'executed' : 'scheduled'} events and refreshes cached dashboard on mobile`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const state = await setup(page, { executed, delay: 350, priorReading: executed });
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Oil Change', exact: true })).toBeVisible();
    if (executed) {
      await expect(page.getByRole('link', { name: 'View Next service' })).toContainText(
        'Mileage threshold reached',
      );
      await expect(page.locator('.dashboard-summary')).toContainText('1,500 km');
    }
    const queryCount = state.queries.filter((name) => name === 'Vehicles').length;
    await page.getByRole('link', { name: 'View Oil Change', exact: true }).click();
    const trigger = page.getByRole('button', { name: 'Delete maintenance event', exact: true });
    await expect(trigger).toHaveAttribute('title', 'Delete maintenance event');
    const edit = page.getByRole('button', { name: 'Edit', exact: true });
    const editBox = await edit.boundingBox();
    const deleteBox = await trigger.boundingBox();
    expect(deleteBox?.width).toBeGreaterThanOrEqual(44);
    expect(deleteBox?.height).toBeGreaterThanOrEqual(44);
    expect(editBox?.y).toBe(deleteBox?.y);
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Delete maintenance event?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('“Oil Change”');
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await cancel.click();
    expect(state.mutations).toHaveLength(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await page.keyboard.press('Tab');
    await expect(
      dialog.getByRole('button', { name: 'Delete maintenance event', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    await expect(cancel).toBeDisabled();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/home$/);
    await expect(page.getByRole('heading', { name: 'Oil Change', exact: true })).toHaveCount(0);
    expect(state.rows()).toHaveLength(executed ? 2 : 0);
    if (executed) {
      await expect(page.locator('.dashboard-summary')).toContainText('1,000 km');
      await expect(page.getByRole('link', { name: 'View Next service' })).toContainText('Due soon');
      await expect(page.getByRole('link', { name: 'View Earlier service' })).toBeVisible();
    }
    expect(
      state.mutations.filter((call) => call.operationName === 'DeleteMaintenanceEvent'),
    ).toHaveLength(1);
    expect(state.queries.filter((name) => name === 'Vehicles').length).toBeGreaterThan(queryCount);
    expect(
      state.queries.filter((name) => name === 'MaintenanceEvents').length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}
test('deletion is hidden during creation and editing, and failures stay in the localized dialog', async ({
  page,
}) => {
  const state = await setup(page, { failure: 'INTERNAL_SERVER_ERROR' });
  await newEvent(page);
  await expect(
    page.getByRole('button', { name: 'Delete maintenance event', exact: true }),
  ).toHaveCount(0);
  await page.goto('/maintenance-events/event-1');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Delete maintenance event', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Delete maintenance event', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Delete maintenance event', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'We could not delete the maintenance event. Please try again.',
  );
  await expect(page).toHaveURL(/maintenance-events\/event-1$/);
  expect(state.rows()).toHaveLength(1);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel('Language').selectOption('it');
  const trigger = page.getByRole('button', { name: 'Elimina intervento', exact: true });
  await expect(trigger).toHaveAttribute('title', 'Elimina intervento');
  await trigger.click();
  dialog = page.getByRole('dialog', { name: 'Eliminare l’intervento?' });
  await expect(dialog).toContainText(
    'Stai per eliminare definitivamente «Oil Change». Questa operazione non può essere annullata.',
  );
  await dialog.getByRole('button', { name: 'Elimina intervento', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'Non è stato possibile eliminare l’intervento. Riprova.',
  );
  await expect(dialog.getByRole('button', { name: 'Annulla', exact: true })).toBeEnabled();
  state.setFailure('');
  await dialog.getByRole('button', { name: 'Elimina intervento', exact: true }).click();
  await expect(page).toHaveURL(/home$/);
});
