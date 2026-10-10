import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { ResendVerification } from '../components/ResendVerification';
import { FORGOT_PASSWORD, RESEND_VERIFICATION } from '../api/operations';
import { AuthLayout } from '../components/AuthLayout';

export function EmailRequestPage({ verification = false }: { verification?: boolean }) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const pending = useRef(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (verification) {
        const result = await client.mutate({
          mutation: RESEND_VERIFICATION,
          variables: { input: { email: email.trim() } },
          fetchPolicy: 'no-cache',
        });
        if (!result.data?.resendVerificationEmail) throw new Error('Missing resend response');
        setWarning(
          result.data.resendVerificationEmail.warnings.some(
            ({ code }) => code === 'VERIFICATION_EMAIL_SEND_FAILED',
          ),
        );
      } else {
        await client.mutate({
          mutation: FORGOT_PASSWORD,
          variables: { input: { email: email.trim() } },
          fetchPolicy: 'no-cache',
        });
      }
      setSent(true);
    } catch {
      setError('auth:errors.emailRequestFailed');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      titleId="email-request-title"
      title={verification ? t('auth:resend.title') : t('auth:forgot.title')}
      description={verification ? t('auth:resend.description') : t('auth:forgot.description')}
      footer={<Link to="/login">{t('auth:actions.backToLogin')}</Link>}
    >
      {sent ? (
        <>
          <p
            className={warning ? 'auth-warning' : 'auth-notice'}
            role="status"
          >
            {warning
              ? t('auth:resend.deliveryWarning')
              : verification
                ? t('auth:resend.success')
                : t('auth:forgot.success')}
          </p>
          {verification && (
            <ResendVerification
              email={email}
              initialCooldown={60}
            />
          )}
        </>
      ) : (
        <form
          className="auth-form"
          onSubmit={submit}
          aria-busy={busy}
        >
          <div className="auth-form__field">
            <label htmlFor="email">{t('common:fields.email')}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy}
            />
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
            disabled={busy}
          >
            {busy
              ? t('common:actions.sending')
              : verification
                ? t('auth:resend.submit')
                : t('auth:forgot.submit')}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
