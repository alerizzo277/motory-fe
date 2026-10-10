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
            ? 'Inserisci una password da 8 a 128 caratteri.'
            : 'Operazione non riuscita. Riprova tra poco.',
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      titleId="reset-title"
      title="Reimposta la password"
      description="Scegli una nuova password per Motory."
      footer={<Link to="/login">Torna al login</Link>}
    >
      {!token || invalid ? (
        <div
          className="auth-notice"
          role="alert"
        >
          <p>Il link per reimpostare la password non è più valido.</p>
          <p>Potrebbe essere scaduto oppure essere già stato utilizzato.</p>
          <Link to="/forgot-password">Richiedi un nuovo link</Link>
        </div>
      ) : success ? (
        <div
          className="auth-notice"
          role="status"
        >
          <p>Password aggiornata correttamente.</p>
          <p>Ora puoi accedere con la nuova password.</p>
          <Link
            className="auth-link-button"
            to="/login"
          >
            Accedi
          </Link>
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={submit}
          aria-busy={busy}
        >
          <div className="auth-form__field">
            <label htmlFor="new-password">Nuova password</label>
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
                {passwordError}
              </p>
            )}
          </div>
          <div className="auth-form__field">
            <label htmlFor="confirm-password">Conferma password</label>
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
                {confirmError}
              </p>
            )}
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
            disabled={busy || !isValid}
          >
            {busy ? 'Aggiornamento…' : 'Reimposta password'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
