import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VEHICLES } from '../../vehicles/api/operations';
import { vehicleErrorKey } from '../../vehicles/api/errors';
import '../../vehicles/vehicles.css';
import '../dashboard.css';
import { DashboardMaintenance } from '../components/DashboardMaintenance';
export function HomePage() {
  const { t, i18n } = useTranslation('vehicles');
  const { data, loading, error, refetch } = useQuery(VEHICLES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const vehicles = data?.vehicles ?? [];
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId) ?? vehicles[0];
  return (
    <main className="dashboard mx-auto flex w-full max-w-[960px] min-w-0 flex-col gap-6 self-start">
      <section
        aria-labelledby="overview-title"
        className="flex min-w-0 flex-col gap-3"
      >
        <h1
          id="overview-title"
          className="dashboard-heading"
        >
          {t('overview')}
        </h1>
        <div className="flex min-w-0 items-center gap-3">
          {!loading && !error && selected && vehicles.length > 1 ? (
            <>
              <label
                className="sr-only"
                htmlFor="selected-vehicle"
              >
                {t('selectVehicle')}
              </label>
              <select
                id="selected-vehicle"
                className="dashboard-selector min-w-0 flex-1"
                value={selected.id}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {vehicles.map((vehicle) => (
                  <option
                    key={vehicle.id}
                    value={vehicle.id}
                  >
                    {vehicle.brand} {vehicle.model} · {vehicle.licensePlate}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="min-w-0 flex-1 text-sm text-motory-slate">
              {!loading && !error && selected ? selected.licensePlate : t('selectVehicle')}
            </span>
          )}
          <Link
            className="dashboard-add flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)]"
            to="/vehicles/new"
            title={t('addVehicle')}
            aria-label={t('addVehicle')}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
        {loading ? (
          <p role="status">{t('loading')}</p>
        ) : error ? (
          <div className="vehicle-panel">
            <p role="alert">{t(vehicleErrorKey(error))}</p>
            <button
              onClick={() => {
                void refetch().catch(() => undefined);
              }}
            >
              {t('retry')}
            </button>
          </div>
        ) : selected ? (
          <Link
            className="dashboard-summary flex min-w-0 flex-col gap-2 rounded-[var(--radius-card)] border border-solid border-motory-light bg-[var(--color-surface)] px-4 py-4 text-motory-navy no-underline hover:border-motory-primary"
            to={`/vehicles/${selected.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="dashboard-summary__title">
                {selected.brand} {selected.model}
              </h2>
              <span
                aria-hidden="true"
                className="shrink-0 text-motory-primary"
              >
                ↗
              </span>
            </div>
            <p className="text-sm text-motory-slate">
              {selected.year} · {selected.licensePlate}
              {selected.fuelType && <> · {t(`fuels.${selected.fuelType}`)}</>}
            </p>
            <p className="text-sm text-motory-slate">
              {t('mileage')}:{' '}
              <strong className="font-semibold text-motory-navy">
                {selected.latestOdometerKm === null
                  ? t('mileageUnavailable')
                  : t('kilometers', {
                      value: new Intl.NumberFormat(i18n.resolvedLanguage).format(
                        selected.latestOdometerKm,
                      ),
                    })}
              </strong>
            </p>
          </Link>
        ) : (
          <div className="vehicle-panel vehicle-empty">
            <h2 className="dashboard-empty-title">{t('noVehicles')}</h2>
            <p>{t('noVehiclesDescription')}</p>
            <Link
              className="vehicle-add"
              to="/vehicles/new"
            >
              {t('addVehicle')}
            </Link>
          </div>
        )}
      </section>
      {!loading && !error && selected ? (
        <>
          <DashboardMaintenance
            key={selected.id}
            vehicle={selected}
          />
          <Link
            className="maintenance-fab"
            to={`/maintenance-events/new?vehicleId=${encodeURIComponent(selected.id)}`}
            title={t('maintenance:addEvent')}
            aria-label={t('maintenance:addEvent')}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </>
      ) : (
        !loading &&
        !error && (
          <div className="dashboard__maintenance flex flex-col gap-8">
            {(['upcoming', 'recent'] as const).map((section) => (
              <section
                key={section}
                aria-labelledby={`${section}-title`}
                className="flex flex-col gap-3"
              >
                <h2
                  className="dashboard-heading"
                  id={`${section}-title`}
                >
                  {t(section)}
                </h2>
                <div className="vehicle-panel vehicle-empty">
                  <p>{t('maintenanceWithoutVehicle')}</p>
                </div>
              </section>
            ))}
          </div>
        )
      )}
    </main>
  );
}
