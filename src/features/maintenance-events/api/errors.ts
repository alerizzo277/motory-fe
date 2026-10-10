import { hasErrorCode } from '../../../graphql/client/errors';
export function maintenanceErrorKey(error: unknown): string {
  if (hasErrorCode(error, 'UNAUTHENTICATED')) return 'auth:errors.unauthenticated';
  if (hasErrorCode(error, 'MAINTENANCE_EVENT_NOT_FOUND')) return 'maintenance:errors.notFound';
  if (hasErrorCode(error, 'VEHICLE_NOT_FOUND')) return 'maintenance:errors.vehicleUnavailable';
  if (hasErrorCode(error, 'VALIDATION_ERROR')) return 'maintenance:errors.validation';
  return 'maintenance:errors.failed';
}
