import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  vehicleInput,
  vehicleDraft,
  validateVehicle,
} from '../src/features/vehicles/validation.ts';
test('vehicle normalization preserves case and separators; empty fuel becomes null', () => {
  assert.deepEqual(
    vehicleInput({
      brand: ' bmw  ',
      model: ' Golf   GTI ',
      year: '2020',
      licensePlate: ' ab 123-cd ',
      fuelType: '',
    }),
    { brand: 'bmw', model: 'Golf GTI', year: 2020, licensePlate: 'AB 123-CD', fuelType: null },
  );
});
test('required fields, integer bounds and future years', () => {
  assert.equal(Object.keys(validateVehicle(vehicleDraft())).length, 4);
  const valid = { brand: 'Ford', model: 'Fiesta', year: '2020', licensePlate: 'X', fuelType: '' };
  assert.deepEqual(validateVehicle(valid), {});
  for (const year of ['1885', '2020.5', String(new Date().getFullYear() + 1)])
    assert.ok(validateVehicle({ ...valid, year }).year);
});
