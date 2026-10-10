import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link, useBlocker, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { validationErrorFields } from '../../../graphql/client/errors';
import { CREATE_VEHICLE, UPDATE_VEHICLE } from '../api/operations';
import { vehicleErrorKey } from '../api/errors';
import { FUEL_TYPES } from '../types';
import type { Vehicle, VehicleDraft, VehicleErrors } from '../types';
import { vehicleDraft, vehicleInput, validateVehicle } from '../validation';

export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const { t, i18n } = useTranslation('vehicles');
  const client = useApolloClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(!vehicle);
  const [draft, setDraft] = useState(() => vehicleDraft(vehicle));
  const [errors, setErrors] = useState<VehicleErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [saved, setSaved] = useState(false);
  const original = vehicleDraft(vehicle);
  const dirty =
    editing &&
    Object.keys(original).some(
      (key) => draft[key as keyof VehicleDraft] !== original[key as keyof VehicleDraft],
    );
  const allowLeave = useRef(false);
  const blocker = useBlocker(() => dirty && !allowLeave.current);
  const confirmation = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = confirmation.current;
    if (blocker.state === 'blocked') dialog?.showModal();
    return () => dialog?.close();
  }, [blocker.state]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  function change(name: keyof VehicleDraft, value: string) {
    if (name === 'fuelType' && value !== '' && !FUEL_TYPES.some((fuel) => fuel === value)) return;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setError(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const validation = validateVehicle(draft);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const input = vehicleInput(draft);
      const result = vehicle
        ? await client.mutate({ mutation: UPDATE_VEHICLE, variables: { id: vehicle.id, input } })
        : await client.mutate({ mutation: CREATE_VEHICLE, variables: { input } });
      const updated =
        result.data &&
        ('updateVehicle' in result.data ? result.data.updateVehicle : result.data.createVehicle);
      if (!updated) throw new Error('Missing vehicle response');
      // Invalidate the list without making a successful save depend on another network request.
      client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'vehicles' });
      client.cache.gc();
      allowLeave.current = true;
      setDraft(vehicleDraft(updated));
      setEditing(false);
      setSaved(true);
      if (!vehicle) void navigate(`/vehicles/${updated.id}`, { replace: true });
    } catch (cause) {
      const fields: VehicleErrors = {};
      for (const field of validationErrorFields(cause))
        if (field in draft) fields[field as keyof VehicleDraft] = 'vehicles:validation.invalid';
      setErrors(fields);
      setError(vehicleErrorKey(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="vehicle-page__heading">
        <div>
          <p className="vehicle-eyebrow">{t('details')}</p>
          <h1>{vehicle ? `${vehicle.brand} ${vehicle.model}` : t('createTitle')}</h1>
        </div>
        {!editing && (
          <button
            onClick={() => {
              allowLeave.current = false;
              setDraft(vehicleDraft(vehicle));
              setEditing(true);
              setSaved(false);
            }}
          >
            {t('edit')}
          </button>
        )}
      </div>
      {saved && <p role="status">{t('saved')}</p>}
      {editing ? (
        <form
          onSubmit={submit}
          noValidate
          aria-busy={busy}
          className="vehicle-form"
        >
          <fieldset disabled={busy}>
            {(['brand', 'model', 'year', 'licensePlate', 'fuelType'] as const).map((name) => (
              <div
                className="vehicle-form__field"
                key={name}
              >
                <label htmlFor={name}>
                  {t(`fields.${name}`)}
                  {name === 'fuelType' ? ` (${t('optional')})` : ''}
                </label>
                {name === 'fuelType' ? (
                  <select
                    id={name}
                    value={draft[name]}
                    onChange={(event) => change(name, event.target.value)}
                    aria-invalid={!!errors[name]}
                    aria-describedby={errors[name] ? `${name}-error` : undefined}
                  >
                    <option value="">{t('unspecified')}</option>
                    {FUEL_TYPES.map((fuel) => (
                      <option
                        key={fuel}
                        value={fuel}
                      >
                        {t(`fuels.${fuel}`)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={name}
                    name={name}
                    type={name === 'year' ? 'number' : 'text'}
                    inputMode={name === 'year' ? 'numeric' : undefined}
                    min={name === 'year' ? 1886 : undefined}
                    max={name === 'year' ? new Date().getFullYear() : undefined}
                    step={name === 'year' ? 1 : undefined}
                    required
                    value={draft[name]}
                    onChange={(event) => change(name, event.target.value)}
                    aria-invalid={!!errors[name]}
                    aria-describedby={errors[name] ? `${name}-error` : undefined}
                  />
                )}
                {errors[name] && (
                  <p
                    id={`${name}-error`}
                    className="error"
                    role="alert"
                  >
                    {t(errors[name])}
                  </p>
                )}
              </div>
            ))}
          </fieldset>
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
              disabled={busy}
              type="submit"
            >
              {busy ? t('saving') : vehicle ? t('saveChanges') : t('saveVehicle')}
            </button>
            {vehicle && (
              <button
                className="vehicle-secondary"
                disabled={busy}
                type="button"
                onClick={() => {
                  setDraft(vehicleDraft(vehicle));
                  setErrors({});
                  setError(null);
                  setEditing(false);
                }}
              >
                {t('cancel')}
              </button>
            )}
          </div>
        </form>
      ) : (
        vehicle && (
          <dl className="vehicle-facts">
            {(['brand', 'model', 'year', 'licensePlate', 'fuelType'] as const).map((name) => (
              <div key={name}>
                <dt>{t(`fields.${name}`)}</dt>
                <dd>
                  {name === 'fuelType'
                    ? vehicle.fuelType
                      ? t(`fuels.${vehicle.fuelType}`)
                      : t('unspecified')
                    : vehicle[name]}
                </dd>
              </div>
            ))}
            <div>
              <dt>{t('mileage')}</dt>
              <dd>
                {vehicle.latestOdometerKm === null
                  ? t('mileageUnavailable')
                  : t('kilometers', {
                      value: new Intl.NumberFormat(i18n.resolvedLanguage).format(
                        vehicle.latestOdometerKm,
                      ),
                    })}
              </dd>
            </div>
          </dl>
        )
      )}
      <Link
        className="vehicle-back"
        to="/home"
      >
        {t('backHome')}
      </Link>
      {blocker.state === 'blocked' && (
        <dialog
          ref={confirmation}
          className="vehicle-confirm"
          aria-labelledby="discard-title"
          onCancel={(event) => {
            event.preventDefault();
            confirmation.current?.close();
            blocker.reset();
          }}
        >
          <div className="vehicle-panel">
            <h2 id="discard-title">{t('unsavedTitle')}</h2>
            <p>{t('unsavedDescription')}</p>
            <div className="vehicle-actions">
              <button
                autoFocus
                onClick={() => {
                  confirmation.current?.close();
                  blocker.reset();
                }}
              >
                {t('keepEditing')}
              </button>
              <button
                className="vehicle-secondary"
                onClick={() => {
                  confirmation.current?.close();
                  blocker.proceed();
                }}
              >
                {t('discard')}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
