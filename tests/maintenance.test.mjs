import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  maintenanceDraft,
  maintenanceInput,
  maintenanceUpdateInput,
  nextDraft,
  scheduledInput,
  validateMaintenance,
  validCalendarDate,
  normalizeCost,
} from '../src/features/maintenance-events/validation.ts';
const categories = [{ id: 'category', code: 'MAINTENANCE' }];
const scheduled = { ...maintenanceDraft(), name: '  Oil   Change ', categoryId: 'category' };
const executed = { ...scheduled, status: 'EXECUTED', executionDate: '2020-02-01' };
for (const deadline of [
  { scheduledDate: '2020-01-01' },
  { scheduledOdometerKm: '0' },
  { scheduledDate: '2020-01-01', scheduledOdometerKm: '1200' },
]) {
  test(`scheduled accepts ${JSON.stringify(deadline)}`, () =>
    assert.deepEqual(validateMaintenance({ ...scheduled, ...deadline }, categories), {}));
}
test('scheduled requires either condition, executed requires a nonfuture date', () => {
  assert.ok(validateMaintenance(scheduled, categories).deadline);
  assert.ok(validateMaintenance({ ...executed, executionDate: '' }, categories).executionDate);
  assert.ok(
    validateMaintenance({ ...executed, executionDate: '2030-01-01' }, categories, '2020-02-01')
      .executionDate,
  );
  assert.deepEqual(validateMaintenance(executed, categories, '2020-02-01'), {});
});
test('valid calendar dates use exact strings rather than local timezone conversions', () => {
  for (const date of ['2024-02-29', '2020-01-01']) assert.equal(validCalendarDate(date), true);
  for (const date of ['2023-02-29', '2020-02-30', '2020-13-01', '2020-1-1', 'not a date'])
    assert.equal(validCalendarDate(date), false);
  const event = {
    ...maintenanceInput(executed),
    id: 'event',
    vehicleId: 'vehicle',
    executionDate: '2020-02-01T00:00:00.000Z',
    scheduledDate: '2020-01-01T00:00:00.000Z',
  };
  assert.equal(maintenanceDraft(event).executionDate, '2020-02-01');
  assert.equal(maintenanceDraft(event).scheduledDate, '2020-01-01');
});
test('normalization preserves capitalization, note content and exact decimal strings', () => {
  const input = maintenanceInput({
    ...executed,
    cost: '1234567890,12',
    provider: '  My   Garage ',
    notes: '  first\n  second  ',
  });
  assert.equal(input.name, 'Oil Change');
  assert.equal(input.cost, '1234567890.12');
  assert.equal(input.provider, 'My   Garage');
  assert.equal(input.notes, 'first\n  second');
  assert.equal(normalizeCost('0,01'), '0.01');
  assert.deepEqual(validateMaintenance({ ...executed, cost: '1234567890,12' }, categories), {});
});
for (const reading of ['-1', '1.5', '1e3', '2147483648', ' ']) {
  test(`rejects mileage ${JSON.stringify(reading)}`, () => {
    assert.ok(
      validateMaintenance({ ...scheduled, scheduledOdometerKm: reading }, categories)
        .scheduledOdometerKm,
    );
    assert.ok(validateMaintenance({ ...executed, odometerKm: reading }, categories).odometerKm);
  });
}
for (const cost of ['-1', '1.001', '10000000000.00', 'NaN', '1e3', '1,2.3']) {
  test(`rejects cost ${cost}`, () =>
    assert.ok(validateMaintenance({ ...executed, cost }, categories).cost));
}
test('validates categories and text bounds', () => {
  assert.ok(validateMaintenance({ ...executed, name: ' ' }, categories).name);
  assert.ok(validateMaintenance({ ...executed, name: 'x'.repeat(201) }, categories).name);
  assert.ok(validateMaintenance({ ...executed, categoryId: 'missing' }, categories).categoryId);
  assert.ok(
    validateMaintenance(
      { ...executed, provider: 'x'.repeat(201), notes: 'x'.repeat(10001) },
      categories,
    ).provider,
  );
  assert.ok(validateMaintenance({ ...executed, notes: 'x'.repeat(10001) }, categories).notes);
});
test('prefills only next name/category and applies independent nested validation', () => {
  const next = nextDraft({
    ...scheduled,
    scheduledDate: '2020-01-01',
    scheduledOdometerKm: '1200',
    notes: 'main',
  });
  assert.deepEqual(next, {
    name: scheduled.name,
    categoryId: 'category',
    scheduledDate: '',
    scheduledOdometerKm: '',
    notes: '',
  });
  assert.ok(validateMaintenance(next, categories).deadline);
  assert.deepEqual(validateMaintenance({ ...next, scheduledOdometerKm: '0' }, categories), {});
  assert.deepEqual(scheduledInput({ ...next, scheduledOdometerKm: '0' }), {
    name: 'Oil Change',
    categoryId: 'category',
    scheduledDate: null,
    scheduledOdometerKm: 0,
    notes: null,
  });
});
test('scheduled submission cannot send stale execution values', () => {
  const input = maintenanceInput({
    ...scheduled,
    scheduledDate: '2020-01-01',
    executionDate: '2020-01-01',
    cost: '10.00',
    provider: 'stale',
    odometerKm: '1200',
  });
  assert.equal(input.executionDate, null);
  assert.equal(input.cost, null);
  assert.equal(input.provider, null);
  assert.equal(input.odometerKm, null);
  assert.equal('nextScheduledEvent' in input, false);
});
test('updates omit untouched fields, clear nullable values and preserve scheduling history', () => {
  const original = {
    ...scheduled,
    scheduledDate: '2020-01-01',
    scheduledOdometerKm: '1200',
    notes: 'previous',
  };
  assert.deepEqual(maintenanceUpdateInput({ ...original, notes: '' }, original), { notes: null });
  assert.deepEqual(
    maintenanceUpdateInput(
      { ...original, status: 'EXECUTED', executionDate: '2020-02-01', cost: '0,01' },
      original,
    ),
    { status: 'EXECUTED', executionDate: '2020-02-01', cost: '0.01' },
  );
  assert.deepEqual(maintenanceUpdateInput(original, original), {});
});
