import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { hasErrorCode, loginErrorKey } from '../../../graphql/client/errors';
import { Link } from 'react-router-dom';
import { PasswordInput } from '../components/PasswordInput';
import { ResendVerification } from '../components/ResendVerification';
import { AuthLayout } from '../components/AuthLayout';
export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [unverified, setUnverified] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const passwordError =
    password.length < 1
      ? 'validation:passwordRequired'
      : password.length > 128
        ? 'validation:passwordMaxLength'
        : null;
  const isValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254 && !passwordError;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !isValid) return;
    setError(null);
    setUnverified(false);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (cause: unknown) {
      setError(loginErrorKey(cause));
      setUnverified(hasErrorCode(cause, 'EMAIL_NOT_VERIFIED'));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthLayout
      titleId="login-title"
      title={t('auth:login.title')}
      description={t('auth:login.description')}
      footer={
        <>
          {t('auth:login.noAccount')} <Link to="/register">{t('auth:register.submit')}</Link>
        </>
      }
    >
      <form
        className="auth-form"
        onSubmit={submit}
        aria-busy={submitting}
      >
        <div className="auth-form__field">
          <label htmlFor="email">{t('common:fields.email')}</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder={t('auth:login.emailPlaceholder')}
            required
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
              setUnverified(false);
            }}
            disabled={submitting}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        <div className="auth-form__field">
          <label htmlFor="password">{t('common:fields.password')}</label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder={t('auth:login.passwordPlaceholder')}
            required
            maxLength={128}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
              setUnverified(false);
            }}
            onBlur={() => setPasswordBlurred(true)}
            aria-invalid={passwordBlurred && !!passwordError}
            disabled={submitting}
            aria-describedby={
              passwordBlurred && passwordError
                ? 'password-error'
                : error
                  ? 'login-error'
                  : undefined
            }
          />
          {passwordBlurred && passwordError && (
            <p
              id="password-error"
              className="error auth-field-error"
              role="alert"
            >
              {t(passwordError)}
            </p>
          )}
        </div>
        <Link to="/forgot-password">{t('auth:forgot.title')}</Link>
        {error && (
          <p
            id="login-error"
            className="error auth-form__error"
            role="alert"
          >
            {t(error)}
          </p>
        )}
        <button
          className="auth-form__submit"
          disabled={submitting || !isValid}
          type="submit"
        >
          {submitting ? t('auth:login.busy') : t('auth:login.submit')}
        </button>
      </form>
      {unverified && <ResendVerification email={email} />}
    </AuthLayout>
  );
}
