import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link, useSearchParams } from 'react-router-dom';
import { VERIFY_EMAIL } from '../api/operations';
import { AuthLayout } from '../components/AuthLayout';
import { hasErrorCode } from '../../../graphql/client/errors';
import { EmailRequestPage } from './EmailRequestPage';

export function VerifyEmailPage() {
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
      title="Verifica email"
      description="Completa la registrazione a Motory."
      footer={<Link to="/login">Torna al login</Link>}
    >
      <div
        className="auth-notice"
        role={status === 'invalid' || status === 'error' ? 'alert' : 'status'}
      >
        {status === 'loading' && <p>Verifica in corso…</p>}
        {status === 'success' && (
          <>
            <p>Email verificata correttamente.</p>
            <p>Ora puoi accedere a Motory.</p>
            <Link
              className="auth-link-button"
              to="/login"
            >
              Accedi
            </Link>
          </>
        )}
        {status === 'invalid' && (
          <>
            <p>Il link di verifica non è più valido.</p>
            <p>
              L'account potrebbe essere già stato attivato oppure il link potrebbe essere scaduto.
            </p>
            <button
              type="button"
              onClick={() => setResend(true)}
            >
              Reinvia email di verifica
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <p>Verifica non riuscita. Riprova tra poco.</p>
            <button
              onClick={() => {
                setResult(null);
                setRetry(retry + 1);
              }}
            >
              Riprova
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
