import { CombinedGraphQLErrors } from '@apollo/client/errors';
export type GraphQLErrorCode =
  | 'EMAIL_NOT_VERIFIED'
  | 'VERIFICATION_TOKEN_INVALID'
  | 'PASSWORD_RESET_TOKEN_INVALID'
  | 'INTERNAL_SERVER_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'EMAIL_ALREADY_EXISTS'
  | 'VALIDATION_ERROR'
  | 'MAINTENANCE_EVENT_NOT_FOUND'
  | 'VEHICLE_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'FORBIDDEN';
export function hasErrorCode(error: unknown, code: GraphQLErrorCode): boolean {
  return (
    CombinedGraphQLErrors.is(error) && error.errors.some((item) => item.extensions?.code === code)
  );
}
export function loginErrorKey(error: unknown): string {
  if (hasErrorCode(error, 'EMAIL_NOT_VERIFIED')) return 'auth:errors.emailNotVerified';
  if (hasErrorCode(error, 'INVALID_CREDENTIALS')) return 'auth:errors.invalidCredentials';
  if (hasErrorCode(error, 'UNAUTHENTICATED')) return 'auth:errors.unauthenticated';
  return 'auth:errors.loginFailed';
}

// The backend exposes fields: [{ field, messages }]. Never display technical messages.
export function validationErrorFields(error: unknown): string[] {
  if (!CombinedGraphQLErrors.is(error)) return [];
  return error.errors.flatMap((item) => {
    if (item.extensions?.code !== 'VALIDATION_ERROR' || !Array.isArray(item.extensions.fields))
      return [];
    return item.extensions.fields.flatMap((entry: unknown) =>
      typeof entry === 'object' &&
      entry !== null &&
      'field' in entry &&
      typeof entry.field === 'string'
        ? [entry.field]
        : [],
    );
  });
}
