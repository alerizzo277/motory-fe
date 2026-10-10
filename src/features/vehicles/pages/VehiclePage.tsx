import { VehicleNavigation } from '../components/VehicleNavigation';
import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VEHICLE } from '../api/operations';
import { vehicleErrorKey } from '../api/errors';
import { VehicleForm } from '../components/VehicleForm';
import '../vehicles.css';
export function VehiclePage() {
  const { id } = useParams();
  const { t } = useTranslation('vehicles');
  const { data, loading, error, refetch } = useQuery(VEHICLE, {
    variables: { id: id ?? '' },
    skip: !id,
  });
  return (
    <main className="vehicle-page vehicle-panel">
      {(loading || error) && <VehicleNavigation />}
      {loading ? (
        <p role="status">{t('loading')}</p>
      ) : error ? (
        <>
          <h1>{t(vehicleErrorKey(error))}</h1>
          <button
            onClick={() => {
              void refetch().catch(() => undefined);
            }}
          >
            {t('retry')}
          </button>
        </>
      ) : (
        <VehicleForm
          key={id ?? 'new'}
          vehicle={data?.vehicle}
        />
      )}
    </main>
  );
}
