import type { RegisterFieldErrors, RegisterForm, RegisterInput } from './types/auth'

export function registerInput(form: RegisterForm): RegisterInput {
  return { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), password: form.password }
}

export function validateRegister(form: RegisterForm): RegisterFieldErrors {
  const input = registerInput(form)
  const errors: RegisterFieldErrors = {}
  if (!input.firstName || input.firstName.length > 100) errors.firstName = 'Inserisci il nome (massimo 100 caratteri).'
  if (!input.lastName || input.lastName.length > 100) errors.lastName = 'Inserisci il cognome (massimo 100 caratteri).'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254) errors.email = 'Inserisci un’email valida (massimo 254 caratteri).'
  if (input.password.length < 8 || input.password.length > 128) errors.password = 'Inserisci una password da 8 a 128 caratteri.'
  if (!form.confirmPassword) errors.confirmPassword = 'Conferma la password.'
  else if (form.confirmPassword !== input.password) errors.confirmPassword = 'Le password non coincidono.'
  return errors
}
