import { ResourceUnavailable } from '../../../shared/components/ResourceUnavailable';
import '../../vehicles/vehicles.css';
import { hasErrorCode } from '../../../graphql/client/errors';
import { useQuery } from '@apollo/client/react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VEHICLE } from '../../vehicles/api/operations';
import { CATEGORIES, MAINTENANCE_EVENT } from '../api/operations';
import { maintenanceErrorKey } from '../api/errors';
import { MaintenanceNavigation } from '../components/MaintenanceNavigation';
import { MaintenanceEventForm } from '../components/MaintenanceEventForm';
import '../maintenance.css';
export function MaintenanceEventPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const vehicleId = params.get('vehicleId') ?? '';
  const { t } = useTranslation('maintenance');
  const eventQuery = useQuery(MAINTENANCE_EVENT, {
    variables: { id: id ?? '' },
    skip: !id,
    fetchPolicy: 'network-only',
  });
  const vehicleQuery = useQuery(VEHICLE, {
    variables: { id: vehicleId },
    skip: !!id || !vehicleId,
    fetchPolicy: 'network-only',
  });
  const categoryQuery = useQuery(CATEGORIES);
  const loading = eventQuery.loading || vehicleQuery.loading || categoryQuery.loading;
  const error =
    !id && !vehicleId
      ? 'maintenance:errors.vehicleUnavailable'
      : !id && vehicleQuery.error
        ? hasErrorCode(vehicleQuery.error, 'VALIDATION_ERROR')
          ? 'maintenance:errors.vehicleUnavailable'
          : maintenanceErrorKey(vehicleQuery.error)
        : eventQuery.error
          ? maintenanceErrorKey(eventQuery.error)
          : categoryQuery.error
            ? maintenanceErrorKey(categoryQuery.error)
            : null;
  const event = eventQuery.data?.maintenanceEvent;
  const vehicle = vehicleQuery.data?.vehicle;
  const owningVehicleId = id ? event?.vehicleId : vehicle?.id;
  const ready = !!owningVehicleId;
  const categories = categoryQuery.data?.categories ?? [];
  if (
    hasErrorCode(eventQuery.error, 'MAINTENANCE_EVENT_NOT_FOUND') ||
    hasErrorCode(eventQuery.error, 'VEHICLE_NOT_FOUND') ||
    hasErrorCode(vehicleQuery.error, 'VEHICLE_NOT_FOUND')
  ) {
    return (
      <main className="maintenance-page">
        <ResourceUnavailable />
      </main>
    );
  }
  return (
    <main className="maintenance-page">
      {error || loading || !ready || !categories.length ? (
        <>
          <MaintenanceNavigation />
          {error ? (
            <>
              <h1>{t('unavailable')}</h1>
              <p
                role="alert"
                className="error"
              >
                {t(error)}
              </p>
            </>
          ) : loading ? (
            <p role="status">{t('loading')}</p>
          ) : (
            <p role="alert">{t(!ready ? 'errors.notFound' : 'errors.noCategories')}</p>
          )}
          {!loading && (id || vehicleId) && (
            <button
              onClick={() => {
                void Promise.allSettled([
                  categoryQuery.refetch(),
                  id ? eventQuery.refetch() : vehicleQuery.refetch(),
                ]);
              }}
            >
              {t('retry')}
            </button>
          )}
        </>
      ) : owningVehicleId ? (
        <MaintenanceEventForm
          key={id ?? vehicleId}
          event={event}
          vehicleId={owningVehicleId}
          vehicleName={!id && vehicle ? `${vehicle.brand} ${vehicle.model}` : undefined}
          categories={categories}
        />
      ) : null}
    </main>
  );
}
