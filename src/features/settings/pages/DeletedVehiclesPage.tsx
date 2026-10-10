import { useEffect, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { evictVehicleData } from '../../vehicles/api/cache';
import { DELETED_VEHICLES } from '../api/operations';
import type { DeletedVehicle } from '../api/operations';
import { SettingsLayout } from '../components/SettingsLayout';
import { VehicleRestorationDialog } from '../components/VehicleRestorationDialog';

export function DeletedVehiclesPage() {
  const { t, i18n } = useTranslation('settings');
  const client = useApolloClient();
  const query = useQuery(DELETED_VEHICLES, { fetchPolicy: 'network-only' });
  const [selected, setSelected] = useState<DeletedVehicle | null>(null);
  const [restored, setRestored] = useState(false);
  const success = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (restored) success.current?.focus();
  }, [restored]);
  // UTC dates preserve the backend's deletion/deadline date across browser timezones.
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  function onRestored(vehicle: DeletedVehicle) {
    const remaining = (query.data?.deletedVehicles ?? []).filter((row) => row.id !== vehicle.id);
    client.cache.batch({
      update(cache) {
        evictVehicleData(cache, vehicle.id);
        const cacheId = cache.identify({ __typename: 'DeletedVehicle', id: vehicle.id });
        if (cacheId) cache.evict({ id: cacheId });
        cache.evict({ id: 'ROOT_QUERY', fieldName: 'deletedVehicles' });
        cache.writeQuery({ query: DELETED_VEHICLES, data: { deletedVehicles: remaining } });
      },
    });
    setSelected(null);
    setRestored(true);
    // Server eligibility may have changed for other records while the dialog was open.
    void query.refetch().catch(() => undefined);
  }
  return (
    <SettingsLayout title={t('deletedVehicles')}>
      {restored && (
        <p
          ref={success}
          tabIndex={-1}
          className="settings-success"
          role="status"
        >
          {t('restoreSuccess')}
        </p>
      )}
      {query.loading ? (
        <p role="status">{t('loadingVehicles')}</p>
      ) : query.error ? (
        <div className="vehicle-panel">
          <p
            className="error"
            role="alert"
          >
            {t('errors.vehiclesFailed')}
          </p>
          <button
            onClick={() => {
              void query.refetch().catch(() => undefined);
            }}
          >
            {t('retry')}
          </button>
        </div>
      ) : !query.data?.deletedVehicles.length ? (
        <div className="vehicle-panel">
          <p className="settings-text">{t('emptyVehicles')}</p>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-4">
          {query.data.deletedVehicles.map((vehicle) => (
            <article
              className="vehicle-panel flex min-w-0 flex-col gap-3"
              key={vehicle.id}
              aria-labelledby={`deleted-${vehicle.id}`}
            >
              <h2
                className="settings-title"
                id={`deleted-${vehicle.id}`}
              >
                {vehicle.brand} {vehicle.model}
              </h2>
              <p className="settings-text text-motory-slate">
                {vehicle.licensePlate} · {vehicle.year}
              </p>
              <dl className="settings-facts flex min-w-0 flex-col gap-2">
                <div>
                  <dt className="settings-label">{t('deletedOn')}</dt>
                  <dd>
                    <time dateTime={vehicle.deletedAt}>
                      {dates.format(new Date(vehicle.deletedAt))}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt className="settings-label">{t('recoverableUntil')}</dt>
                  <dd>
                    <time dateTime={vehicle.recoveryDeadline}>
                      {dates.format(new Date(vehicle.recoveryDeadline))}
                    </time>
                  </dd>
                </div>
              </dl>
              <button
                className="self-start"
                onClick={() => {
                  setSelected(vehicle);
                  setRestored(false);
                }}
              >
                {t('restoreVehicle')}
              </button>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <VehicleRestorationDialog
          key={selected.id}
          vehicle={selected}
          onClose={() => setSelected(null)}
          onRestored={onRestored}
        />
      )}
    </SettingsLayout>
  );
}
