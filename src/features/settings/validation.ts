import type { ProfileInput } from './api/operations';

export function normalizeProfile(input: ProfileInput): ProfileInput {
  return {
    firstName: input.firstName.trim().replace(/\s+/g, ' '),
    lastName: input.lastName.trim().replace(/\s+/g, ' '),
  };
}
export function validateProfile(input: ProfileInput) {
  const normalized = normalizeProfile(input);
  const errors: Partial<Record<keyof ProfileInput, string>> = {};
  for (const field of ['firstName', 'lastName'] as const) {
    if (!normalized[field] || normalized[field].length > 100) errors[field] = 'errors.invalidName';
  }
  return errors;
}
