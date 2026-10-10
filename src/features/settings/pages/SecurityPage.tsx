import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { PasswordInput } from '../../auth/components/PasswordInput';
import { getAccessToken } from '../../auth/tokenStorage';
import { hasErrorCode } from '../../../graphql/client/errors';
import { CHANGE_PASSWORD } from '../api/operations';
import { validatePasswordChange } from '../passwordValidation';
import type { PasswordChangeForm } from '../passwordValidation';
import { SettingsLayout } from '../components/SettingsLayout';
import { PasswordGenerator } from '../components/PasswordGenerator';

const EMPTY: PasswordChangeForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
export function SecurityPage() {
  const { t } = useTranslation('settings');
  const client = useApolloClient();
  const [form, setForm] = useState<PasswordChangeForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordChangeForm, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const invalid = validatePasswordChange(form);
    setErrors(invalid);
    setError(null);
    setSuccess(false);
    if (Object.keys(invalid).length) return;
    pending.current = true;
    setBusy(true);
    const sessionToken = getAccessToken();
    try {
      const result = await client.mutate({
        mutation: CHANGE_PASSWORD,
        variables: {
          input: { currentPassword: form.currentPassword, newPassword: form.newPassword },
        },
        fetchPolicy: 'no-cache',
      });
      if (getAccessToken() !== sessionToken) return;
      if (!result.data?.changePassword) throw new Error('Missing password change response');
      setForm(EMPTY);
      setErrors({});
      setReset((value) => value + 1);
      setSuccess(true);
    } catch (cause) {
      if (hasErrorCode(cause, 'INVALID_CURRENT_PASSWORD'))
        setErrors({ currentPassword: 'settings:security.errors.currentIncorrect' });
      else if (hasErrorCode(cause, 'PASSWORD_UNCHANGED'))
        setErrors({ newPassword: 'settings:security.errors.unchanged' });
      else
        setError(
          hasErrorCode(cause, 'VALIDATION_ERROR')
            ? 'security.errors.validation'
            : 'security.errors.failed',
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <SettingsLayout title={t('security.title')}>
      <section className="vehicle-panel">
        <form
          className="flex min-w-0 flex-col gap-5"
          noValidate
          aria-busy={busy}
          onSubmit={submit}
        >
          {success && (
            <p
              className="settings-success"
              role="status"
            >
              {t('security.success')}
            </p>
          )}
          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
            <div
              key={field}
              className="flex min-w-0 flex-col gap-2"
            >
              <label htmlFor={field}>{t(`security.${field}`)}</label>
              <PasswordInput
                key={`${field}-${reset}`}
                id={field}
                required
                autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'}
                value={form[field]}
                disabled={busy}
                aria-invalid={!!errors[field]}
                aria-describedby={errors[field] ? `${field}-error` : undefined}
                onChange={(event) => {
                  setForm({ ...form, [field]: event.target.value });
                  setSuccess(false);
                }}
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
          {error && (
            <p
              className="error"
              role="alert"
            >
              {t(error)}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
          >
            {t(busy ? 'security.saving' : 'security.save')}
          </button>
        </form>
      </section>
      <PasswordGenerator
        key={reset}
        busy={busy}
        onUse={(password) => {
          setForm({ ...form, newPassword: password, confirmPassword: password });
          setErrors({});
          setError(null);
          setSuccess(false);
        }}
      />
    </SettingsLayout>
  );
}
