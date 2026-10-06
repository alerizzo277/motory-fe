import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { loginErrorMessage } from '../../../graphql/client/errors'
import { Link, useLocation } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
export function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const state: unknown = location.state
  const registered = typeof state === 'object' && state !== null && 'registered' in state && state.registered === true
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) { setError('Inserisci un’email valida e la password.'); return }
    setSubmitting(true)
    try { await login({ email: email.trim(), password }) }
    catch (cause: unknown) { setError(loginErrorMessage(cause)) }
    finally { setSubmitting(false) }
  }
  return (
    <AuthLayout titleId="login-title" title="Bentornato" description="Accedi al tuo account Motory."
      footer={<>Non hai ancora un account? <Link to="/register">Registrati</Link></>}>
      {registered && <p className="auth-notice" role="status">Registrazione completata. Ora puoi accedere.</p>}
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
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        <div className="auth-form__field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Inserisci la tua password"
            required
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        {error && <p id="login-error" className="error auth-form__error" role="alert">{error}</p>}
        <button className="auth-form__submit" disabled={submitting} type="submit">
          {submitting ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>
    </AuthLayout>
  )
}
