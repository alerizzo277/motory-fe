import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { loginErrorMessage } from '../../../graphql/client/errors'
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
  return <main className="card">
    <p className="brand">Motory</p><h1>Accedi</h1><p>Accedi al tuo account.</p>
    <form onSubmit={submit} aria-busy={submitting}>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} />
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={submitting} type="submit">{submitting ? 'Accesso in corso…' : 'Accedi'}</button>
    </form>
  </main>
}
