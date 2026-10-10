import { hasErrorCode, validationErrorFields } from '../../../graphql/client/errors.ts';
import type { RegisterFieldErrors } from '../types/auth';

const fieldKeys = {
  firstName: 'validation:firstNameInvalid',
  lastName: 'validation:lastNameInvalid',
  email: 'validation:emailInvalid',
  password: 'validation:passwordLength',
};

export function registerErrors(error: unknown): {
  fields: RegisterFieldErrors;
  message: string | null;
} {
  if (hasErrorCode(error, 'EMAIL_ALREADY_EXISTS')) {
    return { fields: { email: 'auth:errors.emailAlreadyExists' }, message: null };
  }
  if (hasErrorCode(error, 'VALIDATION_ERROR')) {
    const fields: RegisterFieldErrors = {};
    for (const field of validationErrorFields(error)) {
      if (Object.hasOwn(fieldKeys, field)) {
        const key = field as keyof typeof fieldKeys;
        fields[key] = fieldKeys[key];
      }
    }
    return { fields, message: 'validation:checkFields' };
  }
  return { fields: {}, message: 'common:errors.generic' };
}
