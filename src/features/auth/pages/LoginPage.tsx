import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { loginErrorMessage } from '../../../graphql/client/errors'
import { BrandLogo } from '../../../shared/components/BrandLogo'
import './LoginPage.css'
export function LoginPage() {
  const { login } = useAuth()
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
    <main className="card login-card" aria-labelledby="login-title">
      <header className="login-card__header">
        <BrandLogo />
        <div className="login-card__intro">
          <h1 id="login-title">Bentornato</h1>
          <p>Accedi al tuo account Motory.</p>
        </div>
      </header>
      <form className="login-form" onSubmit={submit} aria-busy={submitting}>
        <div className="login-form__field">
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
        <div className="login-form__field">
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
        {error && <p id="login-error" className="error login-form__error" role="alert">{error}</p>}
        <button className="login-form__submit" disabled={submitting} type="submit">
          {submitting ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>
    </main>
  )
}
