import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { ResendVerification } from '../components/ResendVerification';
import { FORGOT_PASSWORD, RESEND_VERIFICATION } from '../api/operations';
import { AuthLayout } from '../components/AuthLayout';

export function EmailRequestPage({ verification = false }: { verification?: boolean }) {
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
      setError('Invio non riuscito. Controlla l’email e riprova tra poco.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      titleId="email-request-title"
      title={verification ? 'Reinvia email di verifica' : 'Password dimenticata?'}
      description={
        verification
          ? 'Richiedi un nuovo link per completare la registrazione.'
          : 'Ricevi le istruzioni per recuperare il tuo account.'
      }
      footer={<Link to="/login">Torna al login</Link>}
    >
      {sent ? (
        <>
          <p
            className={warning ? 'auth-warning' : 'auth-notice'}
            role="status"
          >
            {warning
              ? "Non siamo riusciti a inviare l'email di verifica. Riprova più tardi."
              : verification
                ? "Se l'account necessita ancora di verifica, riceverai una nuova email."
                : 'Se esiste un account associato a questa email, riceverai le istruzioni per reimpostare la password.'}
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
            <label htmlFor="email">Email</label>
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
              {error}
            </p>
          )}
          <button
            className="auth-form__submit"
            disabled={busy}
          >
            {busy ? 'Invio…' : verification ? 'Reinvia email' : 'Invia link di recupero'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
