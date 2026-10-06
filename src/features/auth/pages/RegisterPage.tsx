import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const pending = useRef(false)
  const [form, setForm] = useState<RegisterForm>({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<RegisterFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    setError(null)
    const validation = validateRegister(form)
    setErrors(validation)
    if (Object.keys(validation).length) return
    pending.current = true
    setSubmitting(true)
    try {
      const result = await client.mutate({ mutation: REGISTER, variables: { input: registerInput(form) }, fetchPolicy: 'no-cache' })
      if (!result.data?.register) throw new Error('Missing register response')
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (cause: unknown) {
      const result = registerErrors(cause)
      setErrors(result.fields)
      setError(result.message)
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  return <AuthLayout titleId="register-title" title="Crea un account" description="Registrati per iniziare con Motory."
    footer={<>Hai già un account? <Link to="/login">Accedi</Link></>}>
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={submitting}>
      {fields.map(({ name, label, ...inputProps }) => <div className="auth-form__field" key={name}>
        <label htmlFor={name}>{label}</label>
        <input {...inputProps} id={name} name={name} required value={form[name]} disabled={submitting}
          aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined}
          onChange={(event) => setForm({ ...form, [name]: event.target.value })} />
        {errors[name] && <p id={`${name}-error`} className="error auth-field-error" role="alert">{errors[name]}</p>}
      </div>)}
      {error && <p className="error auth-form__error" role="alert">{error}</p>}
      <button className="auth-form__submit" type="submit" disabled={submitting}>{submitting ? 'Registrazione…' : 'Registrati'}</button>
    </form>
  </AuthLayout>
}
