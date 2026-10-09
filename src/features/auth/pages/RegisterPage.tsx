import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { Link } from 'react-router-dom'
import { PasswordInput } from '../components/PasswordInput'
import { ResendVerification } from '../components/ResendVerification'
import { REGISTER } from '../api/operations'
import { registerErrors } from '../api/registerErrors'
import { AuthLayout } from '../components/AuthLayout'
import { registerInput, validateRegister } from '../registerValidation'
import type { RegisterFieldErrors, RegisterForm } from '../types/auth'

const fields = [
  { name: 'firstName', label: 'Nome', type: 'text', autoComplete: 'given-name', maxLength: 100 },
  { name: 'lastName', label: 'Cognome', type: 'text', autoComplete: 'family-name', maxLength: 100 },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 254 },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', maxLength: 128 },
  { name: 'confirmPassword', label: 'Conferma password', type: 'password', autoComplete: 'new-password', maxLength: 128 },
] as const

export function RegisterPage() {
  const client = useApolloClient()
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const pending = useRef(false)
  const [form, setForm] = useState<RegisterForm>({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
  const [serverErrors, setServerErrors] = useState<RegisterFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [blurred, setBlurred] = useState<Partial<Record<keyof RegisterForm, boolean>>>({})
  const validation = validateRegister(form)
  const isValid = Object.keys(validation).length === 0 && Object.values(serverErrors).every((message) => !message)

  function changeField(name: keyof RegisterForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
    setServerErrors((current) => ({ ...current, [name]: undefined }))
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || !isValid) return
    setError(null)
    pending.current = true
    setSubmitting(true)
    try {
      const result = await client.mutate({ mutation: REGISTER, variables: { input: registerInput(form) }, fetchPolicy: 'no-cache' })
      if (!result.data?.register) throw new Error('Missing register response')
      setRegisteredEmail(result.data.register.email)
    } catch (cause: unknown) {
      const result = registerErrors(cause)
      setServerErrors(result.fields)
      setError(result.message)
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  if (registeredEmail) return <AuthLayout titleId="check-email-title" title="Controlla la tua email" description="Apri il link ricevuto per completare la registrazione." footer={<Link to="/login">Torna al login</Link>}>
    <p className="auth-notice">Abbiamo inviato un link di verifica a: <strong>{registeredEmail}</strong></p>
    <ResendVerification email={registeredEmail} />
  </AuthLayout>

  return <AuthLayout titleId="register-title" title="Crea un account" description="Registrati per iniziare con Motory."
    footer={<>Hai già un account? <Link to="/login">Accedi</Link></>}>
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={submitting}>
      {fields.map(({ name, label, type, ...inputProps }) => {
        const fieldError = serverErrors[name] ?? (blurred[name] ? validation[name] : undefined)
        const Input = type === 'password' ? PasswordInput : 'input'
        return <div className="auth-form__field" key={name}>
        <label htmlFor={name}>{label}</label>
        <Input {...inputProps} {...(type !== 'password' ? { type } : {})} id={name} name={name} required value={form[name]} disabled={submitting}
          aria-invalid={!!fieldError} aria-describedby={fieldError ? `${name}-error` : undefined}
          onBlur={() => setBlurred((current) => ({ ...current, [name]: true }))}
          onChange={(event) => changeField(name, event.target.value)} />
        {fieldError && <p id={`${name}-error`} className="error auth-field-error" role="alert">{fieldError}</p>}
      </div>})}
      {error && <p className="error auth-form__error" role="alert">{error}</p>}
      <button className="auth-form__submit" type="submit" disabled={submitting || !isValid}>{submitting ? 'Registrazione…' : 'Registrati'}</button>
    </form>
  </AuthLayout>
}
