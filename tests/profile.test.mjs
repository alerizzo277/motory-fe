import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfile, validateProfile } from '../src/features/settings/validation.ts';

test('profile normalization preserves capitalization and collapses whitespace without changing the draft', () => {
  const input = { firstName: '  aLiCe \t Maria  ', lastName: ' De\n Rossi ' };
  assert.deepEqual(normalizeProfile(input), { firstName: 'aLiCe Maria', lastName: 'De Rossi' });
  assert.equal(input.firstName, '  aLiCe \t Maria  ');
  assert.deepEqual(validateProfile(input), {});
});
test('both profile names reject blank or oversized normalized values and accept backend boundaries', () => {
  assert.deepEqual(validateProfile({ firstName: ' \n ', lastName: 'x'.repeat(101) }), {
    firstName: 'errors.invalidName',
    lastName: 'errors.invalidName',
  });
  assert.deepEqual(validateProfile({ firstName: 'A', lastName: ' x'.repeat(50) }), {});
  assert.deepEqual(validateProfile({ firstName: 'x'.repeat(100), lastName: 'R' }), {});
});
