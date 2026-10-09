import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { hasErrorCode, loginErrorMessage } from '../../../graphql/client/errors'
import { Link } from 'react-router-dom'
import { PasswordInput } from '../components/PasswordInput'
import { ResendVerification } from '../components/ResendVerification'
import { AuthLayout } from '../components/AuthLayout'
export function LoginPage() {
  const { login } = useAuth()
  const [unverified, setUnverified] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordBlurred, setPasswordBlurred] = useState(false)
  const passwordError = password.length < 1 ? 'Inserisci la password.' : password.length > 128 ? 'La password deve contenere al massimo 128 caratteri.' : null
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254 && !passwordError
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !isValid) return
    setError(null)
    setUnverified(false)
    setSubmitting(true)
    try { await login({ email: email.trim(), password }) }
    catch (cause: unknown) { setError(loginErrorMessage(cause)); setUnverified(hasErrorCode(cause, 'EMAIL_NOT_VERIFIED')) }
    finally { setSubmitting(false) }
  }
  return (
    <AuthLayout titleId="login-title" title="Bentornato" description="Accedi al tuo account Motory."
      footer={<>Non hai ancora un account? <Link to="/register">Registrati</Link></>}>
      <form className="auth-form" onSubmit={submit} aria-busy={submitting}>
        <div className="auth-form__field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="nome@esempio.it"
            required
            maxLength={254}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); setUnverified(false) }}
            disabled={submitting}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        <div className="auth-form__field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Inserisci la tua password"
            required
            maxLength={128}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); setUnverified(false) }}
            onBlur={() => setPasswordBlurred(true)}
            aria-invalid={passwordBlurred && !!passwordError}
            disabled={submitting}
            aria-describedby={passwordBlurred && passwordError ? 'password-error' : error ? 'login-error' : undefined}
          />
          {passwordBlurred && passwordError && <p id="password-error" className="error auth-field-error" role="alert">{passwordError}</p>}
        </div>
        <Link to="/forgot-password">Password dimenticata?</Link>
        {error && <p id="login-error" className="error auth-form__error" role="alert">{error}</p>}
        <button className="auth-form__submit" disabled={submitting || !isValid} type="submit">
          {submitting ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>
      {unverified && <ResendVerification email={email} />}
    </AuthLayout>
  )
}
