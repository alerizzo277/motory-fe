import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link, useSearchParams } from 'react-router-dom';
import { VERIFY_EMAIL } from '../api/operations';
import { AuthLayout } from '../components/AuthLayout';
import { hasErrorCode } from '../../../graphql/client/errors';
import { EmailRequestPage } from './EmailRequestPage';

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [retry, setRetry] = useState(0);
  const [resend, setResend] = useState(false);
  const [result, setResult] = useState<{
    token: string;
    status: 'success' | 'invalid' | 'error';
  } | null>(null);
  // Reuse the same in-flight mutation across StrictMode's effect replay.
  const [requests] = useState(() => new Map<string, Promise<unknown>>());
  useEffect(() => {
    let active = true;
    if (!token) return;
    const key = `${token}:${retry}`;
    let request = requests.get(key);
    if (!request) {
      request = client
        .mutate({ mutation: VERIFY_EMAIL, variables: { token }, fetchPolicy: 'no-cache' })
        .then((response) => {
          if (!response.data?.verifyEmail) throw new Error('Missing verification response');
        });
      requests.set(key, request);
    }
    void request.then(
      () => {
        if (active) setResult({ token, status: 'success' });
      },
      (error: unknown) => {
        if (active)
          setResult({
            token,
            status: hasErrorCode(error, 'VERIFICATION_TOKEN_INVALID') ? 'invalid' : 'error',
          });
      },
    );
    return () => {
      active = false;
    };
  }, [client, token, retry, requests]);
  if (resend) return <EmailRequestPage verification />;
  const status = !token ? 'invalid' : result?.token === token ? result.status : 'loading';
  return (
    <AuthLayout
      titleId="verify-title"
      title={t('auth:verify.title')}
      description={t('auth:verify.description')}
      footer={<Link to="/login">{t('auth:actions.backToLogin')}</Link>}
    >
      <div
        className="auth-notice"
        role={status === 'invalid' || status === 'error' ? 'alert' : 'status'}
      >
        {status === 'loading' && <p>{t('auth:verify.busy')}</p>}
        {status === 'success' && (
          <>
            <p>{t('auth:verify.success')}</p>
            <p>{t('auth:verify.signIn')}</p>
            <Link
              className="auth-link-button"
              to="/login"
            >
              {t('auth:login.submit')}
            </Link>
          </>
        )}
        {status === 'invalid' && (
          <>
            <p>{t('auth:verify.invalid')}</p>
            <p>{t('auth:verify.invalidReason')}</p>
            <button
              type="button"
              onClick={() => setResend(true)}
            >
              {t('auth:resend.title')}
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <p>{t('auth:verify.failed')}</p>
            <button
              onClick={() => {
                setResult(null);
                setRetry(retry + 1);
              }}
            >
              {t('common:actions.retry')}
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
