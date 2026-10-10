import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link, useSearchParams } from 'react-router-dom';
import { validatePasswords } from '../registerValidation';
import { RESET_PASSWORD } from '../api/operations';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordInput } from '../components/PasswordInput';
import { hasErrorCode } from '../../../graphql/client/errors';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const pending = useRef(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState('');
  const [blurred, setBlurred] = useState({ password: false, confirmPassword: false });
  const validation = validatePasswords(password, confirm);
  const isValid = Object.keys(validation).length === 0;
  const passwordError = blurred.password ? validation.password : undefined;
  const confirmError = blurred.confirmPassword ? validation.confirmPassword : undefined;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !isValid) return;
    setError('');
    pending.current = true;
    setBusy(true);
    try {
      const result = await client.mutate({
        mutation: RESET_PASSWORD,
        variables: { input: { token, newPassword: password } },
        fetchPolicy: 'no-cache',
      });
      if (!result.data?.resetPassword) throw new Error('Missing reset response');
      setPassword('');
      setConfirm('');
      setSuccess(true);
    } catch (cause: unknown) {
      if (hasErrorCode(cause, 'PASSWORD_RESET_TOKEN_INVALID')) setInvalid(true);
      else
        setError(
          hasErrorCode(cause, 'VALIDATION_ERROR')
            ? 'validation:passwordLength'
            : 'common:errors.operationFailed',
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      titleId="reset-title"
      title={t('auth:reset.title')}
      description={t('auth:reset.description')}
      footer={<Link to="/login">{t('auth:actions.backToLogin')}</Link>}
    >
      {!token || invalid ? (
        <div
          className="auth-notice"
          role="alert"
        >
          <p>{t('auth:reset.invalid')}</p>
          <p>{t('auth:reset.invalidReason')}</p>
          <Link to="/forgot-password">{t('auth:reset.requestLink')}</Link>
        </div>
      ) : success ? (
        <div
          className="auth-notice"
          role="status"
        >
          <p>{t('auth:reset.success')}</p>
          <p>{t('auth:reset.signIn')}</p>
          <Link
            className="auth-link-button"
            to="/login"
          >
            {t('auth:login.submit')}
          </Link>
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={submit}
          aria-busy={busy}
        >
          <div className="auth-form__field">
            <label htmlFor="new-password">{t('common:fields.newPassword')}</label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={busy}
              value={password}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'new-password-error' : undefined}
              onBlur={() => setBlurred((current) => ({ ...current, password: true }))}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
            />
            {passwordError && (
              <p
                id="new-password-error"
                className="error auth-field-error"
                role="alert"
              >
                {t(passwordError)}
              </p>
            )}
          </div>
          <div className="auth-form__field">
            <label htmlFor="confirm-password">{t('common:fields.confirmPassword')}</label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              required
              maxLength={128}
              disabled={busy}
              value={confirm}
              aria-invalid={!!confirmError}
              aria-describedby={confirmError ? 'confirm-password-error' : undefined}
              onBlur={() => setBlurred((current) => ({ ...current, confirmPassword: true }))}
              onChange={(event) => {
                setConfirm(event.target.value);
                setError('');
              }}
            />
            {confirmError && (
              <p
                id="confirm-password-error"
                className="error auth-field-error"
                role="alert"
              >
                {t(confirmError)}
              </p>
            )}
          </div>
          {error && (
            <p
              className="error auth-form__error"
              role="alert"
            >
              {t(error)}
            </p>
          )}
          <button
            className="auth-form__submit"
            disabled={busy || !isValid}
          >
            {busy ? t('auth:reset.busy') : t('auth:reset.submit')}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
