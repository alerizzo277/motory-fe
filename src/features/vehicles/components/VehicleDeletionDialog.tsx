import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DELETE_VEHICLE, VEHICLE_DELETION_RETENTION_DAYS } from '../api/operations';
import { evictVehicleData } from '../api/cache';
import { hasErrorCode } from '../../../graphql/client/errors';
import type { Vehicle } from '../types';

export function VehicleDeletionDialog({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle;
  onClose: () => void;
}) {
  const { t } = useTranslation('vehicles');
  const client = useApolloClient();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retention = useQuery(VEHICLE_DELETION_RETENTION_DAYS);
  const retentionDays = retention.data?.vehicleDeletionRetentionDays;
  const ready =
    !retention.loading &&
    !retention.error &&
    typeof retentionDays === 'number' &&
    Number.isInteger(retentionDays) &&
    retentionDays > 0;
  const keyword = t('deleteKeyword');
  // Confirmation is case-sensitive; only surrounding whitespace is ignored.
  const confirmed = confirmation.trim() === keyword;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !ready || !confirmed) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await client.mutate({
        mutation: DELETE_VEHICLE,
        variables: { id: vehicle.id },
      });
      if (!result.data?.deleteVehicle) throw new Error('Missing vehicle deletion response');
      evictVehicleData(client.cache, vehicle.id);
      dialog.current?.close();
      void navigate('/home');
    } catch (cause) {
      setError(
        hasErrorCode(cause, 'VEHICLE_NOT_FOUND')
          ? 'common:errors.resourceUnavailable'
          : 'vehicles:errors.deleteFailed',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="vehicle-confirm vehicle-delete-dialog"
      aria-labelledby="vehicle-delete-title"
      aria-describedby="vehicle-delete-description"
      onClose={() => {
        // Ignore close events from effect replay if the dialog has already reopened.
        if (dialog.current?.open === false) onClose();
      }}
      onCancel={(event) => {
        if (pending.current) event.preventDefault();
      }}
    >
      <div className="vehicle-panel">
        <h2 id="vehicle-delete-title">{t('delete')}</h2>
        <div id="vehicle-delete-description">
          <p>
            {t('deleteVehicleMessage', {
              brand: vehicle.brand,
              model: vehicle.model,
              licensePlate: vehicle.licensePlate,
            })}
          </p>
          <p>{t('deleteHistoryMessage')}</p>
          {retention.loading ? (
            <p role="status">{t('retentionLoading')}</p>
          ) : ready ? (
            <p>{t('deleteRetention', { retentionDays })}</p>
          ) : (
            <div>
              <p
                className="error"
                role="alert"
              >
                {t('errors.retentionFailed')}
              </p>
              <button
                type="button"
                className="vehicle-secondary"
                onClick={() => {
                  void retention.refetch().catch(() => undefined);
                }}
              >
                {t('retry')}
              </button>
            </div>
          )}
        </div>
        <form
          onSubmit={submit}
          aria-busy={busy}
          className="flex min-w-0 flex-col gap-3"
        >
          <p id="vehicle-delete-instructions">{t('deleteInstructions', { keyword })}</p>
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="vehicle-delete-confirmation">{t('deleteConfirmationLabel')}</label>
            <input
              id="vehicle-delete-confirmation"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-describedby="vehicle-delete-instructions"
              value={confirmation}
              disabled={busy}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          {error && (
            <p
              className="error"
              role="alert"
            >
              {t(error)}
            </p>
          )}
          <div className="vehicle-actions">
            <button
              type="button"
              className="vehicle-secondary"
              disabled={busy}
              onClick={() => dialog.current?.close()}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="vehicle-destructive"
              disabled={busy || !ready || !confirmed}
            >
              {t(busy ? 'deleting' : 'delete')}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
