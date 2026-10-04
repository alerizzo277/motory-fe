import { CombinedGraphQLErrors } from '@apollo/client/errors'
export type GraphQLErrorCode = 'INVALID_CREDENTIALS' | 'UNAUTHENTICATED' | 'EMAIL_ALREADY_EXISTS' | 'VALIDATION_ERROR' | 'USER_NOT_FOUND' | 'FORBIDDEN'
export function hasErrorCode(error: unknown, code: GraphQLErrorCode): boolean {
  return CombinedGraphQLErrors.is(error) && error.errors.some((item) => item.extensions?.code === code)
}
export function loginErrorMessage(error: unknown): string {
  if (hasErrorCode(error, 'INVALID_CREDENTIALS')) return 'Email o password non corretti.'
  if (hasErrorCode(error, 'UNAUTHENTICATED')) return 'Sessione non valida. Accedi nuovamente.'
  return 'Accesso non riuscito. Riprova tra poco.'
}
