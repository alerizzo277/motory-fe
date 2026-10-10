import { FUEL_TYPES } from './types.ts';
import type { Vehicle, VehicleDraft, VehicleErrors, VehicleInput } from './types.ts';
export function vehicleDraft(vehicle?: Vehicle): VehicleDraft {
  return vehicle
    ? {
        brand: vehicle.brand,
        model: vehicle.model,
        year: String(vehicle.year),
        licensePlate: vehicle.licensePlate,
        fuelType: vehicle.fuelType ?? '',
      }
    : { brand: '', model: '', year: '', licensePlate: '', fuelType: '' };
}
export function vehicleInput(draft: VehicleDraft): VehicleInput {
  return {
    brand: draft.brand.trim().replace(/\s+/g, ' '),
    model: draft.model.trim().replace(/\s+/g, ' '),
    year: Number(draft.year),
    licensePlate: draft.licensePlate.trim().toUpperCase(),
    fuelType: draft.fuelType || null,
  };
}
export function validateVehicle(draft: VehicleDraft): VehicleErrors {
  const input = vehicleInput(draft);
  const errors: VehicleErrors = {};
  for (const field of ['brand', 'model', 'licensePlate'] as const)
    if (!input[field]) errors[field] = 'vehicles:validation.required';
  if (!draft.year.trim()) errors.year = 'vehicles:validation.required';
  else if (
    !Number.isInteger(input.year) ||
    input.year < 1886 ||
    input.year > new Date().getFullYear()
  )
    errors.year = 'vehicles:validation.year';
  if (draft.fuelType && !FUEL_TYPES.includes(draft.fuelType))
    errors.fuelType = 'vehicles:validation.invalid';
  return errors;
}
