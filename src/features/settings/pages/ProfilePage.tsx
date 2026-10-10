import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/hooks/useAuth';
import { ME } from '../../auth/api/operations';
import { getAccessToken } from '../../auth/tokenStorage';
import { hasErrorCode } from '../../../graphql/client/errors';
import { UPDATE_PROFILE } from '../api/operations';
import type { ProfileInput } from '../api/operations';
import { normalizeProfile, validateProfile } from '../validation';
import { SettingsLayout } from '../components/SettingsLayout';
import { SettingsIcon } from '../components/SettingsIcon';

export function ProfilePage() {
  const { t } = useTranslation('settings');
  const { user } = useAuth();
  const client = useApolloClient();
  const [draft, setDraft] = useState<ProfileInput | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileInput, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const editAction = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (!draft && returnFocus.current) {
      editAction.current?.focus();
      returnFocus.current = false;
    }
  }, [draft]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || pending.current) return;
    const invalid = validateProfile(draft);
    setErrors(invalid);
    setFailure(null);
    if (Object.keys(invalid).length) return;
    pending.current = true;
    setBusy(true);
    const sessionToken = getAccessToken();
    try {
      const result = await client.mutate({
        mutation: UPDATE_PROFILE,
        variables: { input: normalizeProfile(draft) },
        fetchPolicy: 'no-cache',
      });
      // A response from a previous session must not replace the current user's me record.
      if (getAccessToken() !== sessionToken) return;
      if (!result.data?.updateProfile) throw new Error('Missing profile response');
      // The session's watched me query supplies both the settings pages and toolbar.
      client.cache.writeQuery({ query: ME, data: { me: result.data.updateProfile } });
      returnFocus.current = true;
      setDraft(null);
    } catch (error) {
      setFailure(
        hasErrorCode(error, 'VALIDATION_ERROR')
          ? 'errors.profileValidation'
          : 'errors.profileFailed',
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <SettingsLayout
      title={t('profile')}
      action={
        !draft && user ? (
          <button
            ref={editAction}
            className="vehicle-icon-action"
            title={t('edit')}
            aria-label={t('edit')}
            onClick={() => {
              setDraft({ firstName: user.firstName, lastName: user.lastName });
              setErrors({});
              setFailure(null);
            }}
          >
            <SettingsIcon kind="edit" />
          </button>
        ) : undefined
      }
    >
      <section className="vehicle-panel">
        {draft ? (
          <form
            className="flex min-w-0 flex-col gap-5"
            onSubmit={save}
            noValidate
            aria-busy={busy}
          >
            {(['firstName', 'lastName'] as const).map((field) => (
              <div
                key={field}
                className="flex min-w-0 flex-col gap-2"
              >
                <label htmlFor={field}>{t(field)}</label>
                <input
                  id={field}
                  autoComplete={field === 'firstName' ? 'given-name' : 'family-name'}
                  autoFocus={field === 'firstName'}
                  value={draft[field]}
                  disabled={busy}
                  aria-invalid={!!errors[field]}
                  aria-describedby={errors[field] ? `${field}-error` : undefined}
                  onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
                />
                {errors[field] && (
                  <p
                    id={`${field}-error`}
                    className="error"
                    role="alert"
                  >
                    {t(errors[field])}
                  </p>
                )}
              </div>
            ))}
            <div>
              <p className="settings-label">{t('email')}</p>
              <p className="settings-text">{user?.email}</p>
            </div>
            {failure && (
              <p
                className="error"
                role="alert"
              >
                {t(failure)}
              </p>
            )}
            <div className="settings-actions flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={busy}
              >
                {t(busy ? 'saving' : 'save')}
              </button>
              <button
                type="button"
                className="vehicle-secondary"
                disabled={busy}
                onClick={() => {
                  returnFocus.current = true;
                  setDraft(null);
                  setErrors({});
                  setFailure(null);
                }}
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        ) : (
          <dl className="settings-facts flex min-w-0 flex-col gap-5">
            {(['firstName', 'lastName', 'email'] as const).map((field) => (
              <div key={field}>
                <dt className="settings-label">{t(field)}</dt>
                <dd>{user?.[field]}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </SettingsLayout>
  );
}
