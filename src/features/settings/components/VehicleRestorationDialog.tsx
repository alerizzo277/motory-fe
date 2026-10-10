import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { hasErrorCode } from '../../../graphql/client/errors';
import { getAccessToken } from '../../auth/tokenStorage';
import { RESTORE_VEHICLE } from '../api/operations';
import type { DeletedVehicle } from '../api/operations';

export function VehicleRestorationDialog({
  vehicle,
  onClose,
  onRestored,
}: {
  vehicle: DeletedVehicle;
  onClose: () => void;
  onRestored: (vehicle: DeletedVehicle) => void;
}) {
  const { t } = useTranslation('settings');
  const client = useApolloClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    const sessionToken = getAccessToken();
    try {
      const result = await client.mutate({
        mutation: RESTORE_VEHICLE,
        variables: { id: vehicle.id },
      });
      if (getAccessToken() !== sessionToken) return;
      if (!result.data?.restoreVehicle) throw new Error('Missing restoration response');
      onRestored(vehicle);
    } catch (cause) {
      setError(
        hasErrorCode(cause, 'VEHICLE_NOT_FOUND')
          ? 'errors.restoreUnavailable'
          : 'errors.restoreFailed',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="vehicle-confirm settings-dialog"
      aria-labelledby="restore-title"
      aria-describedby="restore-message"
      onClose={() => {
        if (dialog.current?.open === false) onClose();
      }}
      onCancel={(event) => {
        if (pending.current) event.preventDefault();
      }}
    >
      <form
        className="vehicle-panel flex min-w-0 flex-col gap-3"
        onSubmit={submit}
        aria-busy={busy}
      >
        <h2
          className="settings-title"
          id="restore-title"
        >
          {t('restoreTitle')}
        </h2>
        <p
          id="restore-message"
          className="settings-text"
        >
          {t('restoreMessage', { brand: vehicle.brand, model: vehicle.model })}
        </p>
        {error && (
          <p
            className="error"
            role="alert"
          >
            {t(error)}
          </p>
        )}
        <div className="settings-actions flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="vehicle-secondary"
            autoFocus
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
          >
            {t(busy ? 'restoring' : 'restore')}
          </button>
        </div>
      </form>
    </dialog>
  );
}
