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
  | 'USER_NOT_FOUND'
  | 'FORBIDDEN';
export function hasErrorCode(error: unknown, code: GraphQLErrorCode): boolean {
  return (
    CombinedGraphQLErrors.is(error) && error.errors.some((item) => item.extensions?.code === code)
  );
}
export function loginErrorMessage(error: unknown): string {
  if (hasErrorCode(error, 'EMAIL_NOT_VERIFIED'))
    return 'Il tuo indirizzo email non è ancora stato verificato. Controlla la tua casella di posta oppure richiedi una nuova email di verifica.';
  if (hasErrorCode(error, 'INVALID_CREDENTIALS')) return 'Email o password non corretti.';
  if (hasErrorCode(error, 'UNAUTHENTICATED')) return 'Sessione non valida. Accedi nuovamente.';
  return 'Accesso non riuscito. Riprova tra poco.';
}

// Il backend espone fields: [{ field, messages }]. Non mostriamo messaggi tecnici.
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
