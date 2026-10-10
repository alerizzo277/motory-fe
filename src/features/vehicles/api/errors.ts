import { hasErrorCode } from '../../../graphql/client/errors';
export function vehicleErrorKey(error: unknown): string {
  if (hasErrorCode(error, 'VEHICLE_NOT_FOUND')) return 'vehicles:errors.notFound';
  if (hasErrorCode(error, 'UNAUTHENTICATED')) return 'auth:errors.unauthenticated';
  if (hasErrorCode(error, 'VALIDATION_ERROR')) return 'vehicles:errors.validation';
  return 'vehicles:errors.failed';
}
