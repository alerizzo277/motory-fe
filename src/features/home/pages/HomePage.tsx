import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VEHICLES } from '../../vehicles/api/operations';
import { vehicleErrorKey } from '../../vehicles/api/errors';
import '../../vehicles/vehicles.css';
export function HomePage() {
  const { t, i18n } = useTranslation('vehicles');
  const { data, loading, error, refetch } = useQuery(VEHICLES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const vehicles = data?.vehicles ?? [];
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId) ?? vehicles[0];
  return (
    <main className="vehicle-page dashboard">
      <div className="vehicle-page__heading">
        <h1>{t('homeTitle')}</h1>
        <Link
          className="vehicle-add"
          to="/vehicles/new"
        >
          {t('addVehicle')}
        </Link>
      </div>
      <section aria-labelledby="overview-title">
        <h2
          id="overview-title"
          className="vehicle-eyebrow"
        >
          {t('overview')}
        </h2>
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
          <>
            {vehicles.length > 1 && (
              <div className="vehicle-selector">
                <label htmlFor="selected-vehicle">{t('selectVehicle')}</label>
                <select
                  id="selected-vehicle"
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
              </div>
            )}
            <Link
              className="vehicle-overview vehicle-panel"
              to={`/vehicles/${selected.id}`}
            >
              <div className="vehicle-overview__top">
                <span
                  aria-hidden="true"
                  className="vehicle-symbol"
                >
                  ↗
                </span>
                <span>{t('viewDetails')}</span>
              </div>
              <h3>
                {selected.brand} <span>{selected.model}</span>
              </h3>
              <p>
                {selected.year} · {selected.licensePlate}
              </p>
              {selected.fuelType && <p>{t(`fuels.${selected.fuelType}`)}</p>}
              <div className="vehicle-overview__mileage">
                <span>{t('mileage')}</span>
                <strong>
                  {selected.latestOdometerKm === null
                    ? t('mileageUnavailable')
                    : t('kilometers', {
                        value: new Intl.NumberFormat(i18n.resolvedLanguage).format(
                          selected.latestOdometerKm,
                        ),
                      })}
                </strong>
              </div>
            </Link>
          </>
        ) : (
          <div className="vehicle-panel vehicle-empty">
            <h3>{t('noVehicles')}</h3>
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
      <div className="dashboard__maintenance">
        {(['upcoming', 'recent'] as const).map((section) => (
          <section
            key={section}
            aria-labelledby={`${section}-title`}
          >
            <h2
              className="vehicle-eyebrow"
              id={`${section}-title`}
            >
              {t(section)}
            </h2>
            <div className="vehicle-panel vehicle-empty">
              <span
                className="vehicle-empty__mark"
                aria-hidden="true"
              >
                —
              </span>
              <p>{t(selected ? `${section}Empty` : 'maintenanceWithoutVehicle')}</p>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
