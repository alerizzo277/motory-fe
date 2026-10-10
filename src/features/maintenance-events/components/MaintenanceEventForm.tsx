import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { validationErrorFields } from '../../../graphql/client/errors';
import {
  CREATE_MAINTENANCE_EVENT,
  MAINTENANCE_EVENT,
  UPDATE_MAINTENANCE_EVENT,
} from '../api/operations';
import { maintenanceErrorKey } from '../api/errors';
import type {
  Category,
  MaintenanceDraft,
  MaintenanceErrors,
  MaintenanceEvent,
  MaintenanceStatus,
} from '../types';
import {
  maintenanceDraft,
  maintenanceInput,
  maintenanceUpdateInput,
  nextDraft,
  scheduledInput,
  validateMaintenance,
} from '../validation';
import { MaintenanceNavigation } from './MaintenanceNavigation';
import { EventFields } from './EventFields';
import { EventDetails } from './EventDetails';
interface MaintenanceEventFormProps {
  event?: MaintenanceEvent;
  vehicleId: string;
  vehicleName?: string;
  categories: Category[];
}
export function MaintenanceEventForm({
  event,
  vehicleId,
  vehicleName,
  categories,
}: MaintenanceEventFormProps) {
  const { t, i18n } = useTranslation('maintenance');
  const client = useApolloClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [editing, setEditing] = useState(!event);
  const [draft, setDraft] = useState(() => maintenanceDraft(event));
  const [baseline, setBaseline] = useState(() => maintenanceDraft(event));
  const [next, setNext] = useState(() => nextDraft(draft));
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextInitialized, setNextInitialized] = useState(false);
  const [errors, setErrors] = useState<MaintenanceErrors>({});
  const [nextErrors, setNextErrors] = useState<MaintenanceErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(() =>
    location.state &&
    typeof location.state === 'object' &&
    'maintenanceSaved' in location.state &&
    location.state.maintenanceSaved === true
      ? 'saved'
      : null,
  );
  const pending = useRef(false);
  const allowLeave = useRef(false);
  const dirty =
    editing &&
    (scheduleNext ||
      Object.keys(baseline).some(
        (key) => draft[key as keyof MaintenanceDraft] !== baseline[key as keyof MaintenanceDraft],
      ));
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
  function resetFeedback() {
    setErrors({});
    setNextErrors({});
    setError(null);
    setSaved(null);
  }
  function startEdit(complete = false) {
    const initial = maintenanceDraft(event);
    setBaseline(initial);
    setDraft(complete ? { ...initial, status: 'EXECUTED' } : initial);
    setNext(nextDraft(initial));
    setNextInitialized(false);
    setScheduleNext(false);
    resetFeedback();
    allowLeave.current = false;
    setEditing(true);
    requestAnimationFrame(() =>
      document.getElementById(complete ? 'event-executionDate' : 'event-name')?.focus(),
    );
  }
  function change(name: keyof MaintenanceDraft, value: string) {
    if (name === 'status') return;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined, deadline: undefined }));
    setError(null);
  }
  function switchStatus(status: MaintenanceStatus) {
    if (event?.status === 'EXECUTED') return;
    setDraft((current) =>
      status === 'SCHEDULED'
        ? { ...current, status, executionDate: '', odometerKm: '', cost: '', provider: '' }
        : { ...current, status },
    );
    if (status === 'SCHEDULED') setScheduleNext(false);
    resetFeedback();
  }
  async function submit(submission: FormEvent<HTMLFormElement>) {
    submission.preventDefault();
    if (pending.current) return;
    const mainValidation = validateMaintenance(draft, categories);
    const nestedValidation =
      scheduleNext && draft.status === 'EXECUTED' ? validateMaintenance(next, categories) : {};
    setErrors(mainValidation);
    setNextErrors(nestedValidation);
    if (Object.keys(mainValidation).length || Object.keys(nestedValidation).length) {
      const prefix = Object.keys(mainValidation).length ? 'event' : 'next';
      const field = Object.keys(
        Object.keys(mainValidation).length ? mainValidation : nestedValidation,
      )[0];
      document
        .getElementById(`${prefix}-${field === 'deadline' ? 'scheduledDate' : field}`)
        ?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const nextInput =
        scheduleNext && draft.status === 'EXECUTED'
          ? { nextScheduledEvent: scheduledInput(next) }
          : {};
      const result = event
        ? await client.mutate({
            mutation: UPDATE_MAINTENANCE_EVENT,
            variables: {
              id: event.id,
              input: { ...maintenanceUpdateInput(draft, baseline), ...nextInput },
            },
          })
        : await client.mutate({
            mutation: CREATE_MAINTENANCE_EVENT,
            variables: { input: { ...maintenanceInput(draft), vehicleId, ...nextInput } },
          });
      const payload =
        result.data &&
        ('updateMaintenanceEvent' in result.data
          ? result.data.updateMaintenanceEvent
          : result.data.createMaintenanceEvent);
      if (!payload) throw new Error('Missing maintenance response');
      const updated = payload.event;
      client.cache.writeQuery({
        query: MAINTENANCE_EVENT,
        variables: { id: updated.id },
        data: { maintenanceEvent: updated },
      });
      // Subsequent dashboard queries must fetch authoritative mileage and both event records.
      client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'maintenanceEvents' });
      client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'vehicles' });
      const vehicleCacheId = client.cache.identify({
        __typename: 'Vehicle',
        id: updated.vehicleId,
      });
      if (vehicleCacheId) client.cache.evict({ id: vehicleCacheId, fieldName: 'latestOdometerKm' });
      client.cache.evict({
        id: 'ROOT_QUERY',
        fieldName: 'vehicle',
        args: { id: updated.vehicleId },
      });
      client.cache.gc();
      allowLeave.current = true;
      setDraft(maintenanceDraft(updated));
      setBaseline(maintenanceDraft(updated));
      setEditing(false);
      setScheduleNext(false);
      setSaved(payload.nextScheduledEvent ? 'savedWithNext' : 'saved');
      if (!event)
        void navigate(`/maintenance-events/${updated.id}`, {
          replace: true,
          state: { maintenanceSaved: true },
        });
    } catch (cause) {
      const fields: MaintenanceErrors = {};
      for (const field of validationErrorFields(cause)) {
        if (field in draft || field === 'nextScheduledEvent')
          fields[field as keyof MaintenanceErrors] = 'maintenance:validation.invalid';
      }
      setErrors(fields);
      setError(maintenanceErrorKey(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const hasPlan = draft.scheduledDate || draft.scheduledOdometerKm;
  return (
    <>
      <MaintenanceNavigation
        onEdit={!editing ? () => startEdit() : undefined}
        busy={busy}
      />
      <div className="maintenance-heading">
        <p className="maintenance-eyebrow">{t('details')}</p>
        <h1>{event ? event.name : t('createTitle')}</h1>
        {vehicleName && <p>{vehicleName}</p>}
      </div>
      {saved && <p role="status">{t(saved)}</p>}
      {editing ? (
        <form
          noValidate
          onSubmit={submit}
          aria-busy={busy}
          className="maintenance-form"
        >
          <fieldset disabled={busy}>
            {event?.status === 'EXECUTED' ? (
              <p>
                {t('fields.status')}: <strong>{t('statuses.EXECUTED')}</strong>
              </p>
            ) : (
              <fieldset className="maintenance-status">
                <legend>{t('fields.status')}</legend>
                {(['SCHEDULED', 'EXECUTED'] as const).map((status) => (
                  <label
                    key={status}
                    className={draft.status === status ? 'maintenance-status__selected' : ''}
                  >
                    <input
                      type="radio"
                      name="eventStatus"
                      value={status}
                      checked={draft.status === status}
                      onChange={() => switchStatus(status)}
                    />
                    {t(`statuses.${status}`)}
                  </label>
                ))}
              </fieldset>
            )}
            <EventFields
              draft={draft}
              categories={categories}
              errors={errors}
              prefix="event"
              onChange={change}
            />
            {draft.status === 'EXECUTED' && hasPlan && (
              <section className="maintenance-history">
                <h2>{t('originalPlan')}</h2>
                <dl className="maintenance-facts">
                  {draft.scheduledDate && (
                    <div>
                      <dt>{t('fields.scheduledDate')}</dt>
                      <dd>
                        {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                          dateStyle: 'long',
                          timeZone: 'UTC',
                        }).format(new Date(`${draft.scheduledDate}T00:00:00Z`))}
                      </dd>
                    </div>
                  )}
                  {draft.scheduledOdometerKm && (
                    <div>
                      <dt>{t('fields.scheduledOdometerKm')}</dt>
                      <dd>
                        {t('kilometers', {
                          value: new Intl.NumberFormat(i18n.resolvedLanguage).format(
                            Number(draft.scheduledOdometerKm),
                          ),
                        })}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}
            {draft.status === 'EXECUTED' && (
              <section className="maintenance-next">
                <h2>{t('nextTitle')}</h2>
                <label className="maintenance-checkbox">
                  <input
                    type="checkbox"
                    checked={scheduleNext}
                    onChange={(change) => {
                      const enabled = change.target.checked;
                      if (enabled && !nextInitialized) {
                        setNext(nextDraft(draft));
                        setNextInitialized(true);
                      }
                      setScheduleNext(enabled);
                      setNextErrors({});
                      setError(null);
                    }}
                  />
                  {t('scheduleAnother')}
                </label>
                {scheduleNext && (
                  <fieldset>
                    <legend>{t('nextDetails')}</legend>
                    <EventFields
                      draft={next}
                      categories={categories}
                      errors={nextErrors}
                      prefix="next"
                      onChange={(name, value) => {
                        if (name in next) setNext((current) => ({ ...current, [name]: value }));
                        setNextErrors((current) => ({
                          ...current,
                          [name]: undefined,
                          deadline: undefined,
                        }));
                        setErrors((current) => ({ ...current, nextScheduledEvent: undefined }));
                        setError(null);
                      }}
                    />
                  </fieldset>
                )}
                {errors.nextScheduledEvent && (
                  <p
                    role="alert"
                    className="error"
                  >
                    {t(errors.nextScheduledEvent)}
                  </p>
                )}
              </section>
            )}
          </fieldset>
          {error && (
            <p
              className="error"
              role="alert"
            >
              {t(error)}
            </p>
          )}
          <div className="maintenance-actions">
            <button
              disabled={busy}
              type="submit"
            >
              {busy ? t('saving') : event ? t('saveChanges') : t('saveEvent')}
            </button>
            {event && (
              <button
                type="button"
                disabled={busy}
                className="maintenance-secondary"
                onClick={() => {
                  setDraft(maintenanceDraft(event));
                  setScheduleNext(false);
                  resetFeedback();
                  setEditing(false);
                }}
              >
                {t('cancel')}
              </button>
            )}
          </div>
        </form>
      ) : (
        event && (
          <>
            <EventDetails
              event={event}
              categories={categories}
            />
            {event.status === 'SCHEDULED' && (
              <button
                type="button"
                onClick={() => startEdit(true)}
              >
                {t('complete')}
              </button>
            )}
          </>
        )
      )}
      {blocker.state === 'blocked' && (
        <dialog
          ref={confirmation}
          className="maintenance-confirm"
          aria-labelledby="maintenance-discard-title"
          onCancel={(event) => {
            event.preventDefault();
            confirmation.current?.close();
            blocker.reset();
          }}
        >
          <h2 id="maintenance-discard-title">{t('unsavedTitle')}</h2>
          <p>{t('unsavedDescription')}</p>
          <div className="maintenance-actions">
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
              className="maintenance-secondary"
              onClick={() => {
                confirmation.current?.close();
                blocker.proceed();
              }}
            >
              {t('discard')}
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
