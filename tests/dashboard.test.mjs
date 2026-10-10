import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarToday,
  deadlineStatus,
  upcomingEvents,
  recentEvents,
} from '../src/features/home/maintenance.ts';
const event = (overrides = {}) => ({
  id: 'a',
  status: 'SCHEDULED',
  scheduledDate: null,
  scheduledOdometerKm: null,
  ...overrides,
});
const today = '2026-10-10';
for (const [date, status] of [
  ['2026-10-09', 'overdue'],
  ['2026-10-10', 'dueSoon'],
  ['2026-10-17', 'dueSoon'],
  ['2026-10-18', 'approaching'],
  ['2026-11-09', 'approaching'],
  ['2026-11-10', 'scheduled'],
]) {
  test(`calendar deadline ${date}: ${status}`, () =>
    assert.equal(
      deadlineStatus(event({ scheduledDate: date + 'T00:00:00Z' }), null, today),
      status,
    ));
}
for (const [remaining, status] of [
  [-1, 'mileageReached'],
  [0, 'mileageReached'],
  [1, 'dueSoon'],
  [500, 'dueSoon'],
  [501, 'approaching'],
  [1000, 'approaching'],
  [1001, 'scheduled'],
]) {
  test(`mileage boundary ${remaining}: ${status}`, () =>
    assert.equal(
      deadlineStatus(event({ scheduledOdometerKm: 10000 + remaining }), 10000, today),
      status,
    ));
}
test('missing actual mileage never warns; executed events have no deadline', () => {
  assert.equal(deadlineStatus(event({ scheduledOdometerKm: 0 }), null, today), 'scheduled');
  assert.equal(
    deadlineStatus(
      event({ status: 'EXECUTED', scheduledDate: '2000-01-01', scheduledOdometerKm: 0 }),
      10000,
      today,
    ),
    'scheduled',
  );
});
test('combined conditions use most urgent status and date overdue takes precedence', () => {
  assert.equal(
    deadlineStatus(event({ scheduledDate: '2026-10-09', scheduledOdometerKm: 1 }), 10000, today),
    'overdue',
  );
  assert.equal(
    deadlineStatus(event({ scheduledDate: '2026-10-10', scheduledOdometerKm: 1 }), 10000, today),
    'mileageReached',
  );
  assert.equal(
    deadlineStatus(
      event({ scheduledDate: '2026-11-01', scheduledOdometerKm: 10100 }),
      10000,
      today,
    ),
    'dueSoon',
  );
});
test('upcoming ordering preserves input and includes mileage-only records, limited to five', () => {
  const rows = [
    event({ id: 'normal', scheduledDate: '2027-01-01' }),
    event({ id: 'mileage', scheduledOdometerKm: 9000 }),
    event({ id: 'past', scheduledDate: '2026-10-09' }),
    event({ id: 'soon', scheduledDate: '2026-10-11' }),
    event({ id: 'b', scheduledDate: '2026-11-01' }),
    event({ id: 'a', scheduledDate: '2026-11-01' }),
    event({ id: 'executed', status: 'EXECUTED' }),
  ];
  const copy = structuredClone(rows);
  assert.deepEqual(
    upcomingEvents(rows, 10000, today).map((row) => row.id),
    ['past', 'mileage', 'soon', 'a', 'b'],
  );
  assert.deepEqual(rows, copy);
});
test('recent date descending then stable id, five records, never scheduled', () => {
  const rows = Array.from({ length: 7 }, (_, i) =>
    event({ id: String(i), status: 'EXECUTED', executionDate: `2026-10-0${i + 1}` }),
  );
  assert.deepEqual(
    recentEvents([...rows, event()]).map((row) => row.id),
    ['6', '5', '4', '3', '2'],
  );
  assert.deepEqual(
    recentEvents([
      event({ id: 'b', status: 'EXECUTED', executionDate: today }),
      event({ id: 'a', status: 'EXECUTED', executionDate: today }),
    ]).map((row) => row.id),
    ['a', 'b'],
  );
});
test('calendar comparisons do not shift at daylight-saving boundaries', () => {
  assert.equal(
    deadlineStatus(event({ scheduledDate: '2026-03-30T00:00:00Z' }), null, '2026-03-29'),
    'dueSoon',
  );
  const local = new Date(2026, 9, 10, 0, 1);
  assert.equal(calendarToday(local), today);
});

test('expanded lists preserve urgency and chronological ordering beyond the initial five', () => {
  const scheduled = Array.from({ length: 7 }, (_, i) =>
    event({ id: String(i), scheduledDate: `2026-10-${String(i + 10).padStart(2, '0')}` }),
  );
  const allScheduled = upcomingEvents(scheduled, null, today, Infinity);
  assert.equal(allScheduled.length, 7);
  assert.deepEqual(allScheduled.slice(0, 5), upcomingEvents(scheduled, null, today));
  const executed = scheduled.map((row) => ({
    ...row,
    status: 'EXECUTED',
    executionDate: row.scheduledDate,
  }));
  const allExecuted = recentEvents(executed, Infinity);
  assert.equal(allExecuted.length, 7);
  assert.deepEqual(allExecuted.slice(0, 5), recentEvents(executed));
  assert.deepEqual(
    allExecuted.map((row) => row.id),
    ['6', '5', '4', '3', '2', '1', '0'],
  );
});
