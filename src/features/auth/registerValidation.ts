import type { RegisterFieldErrors, RegisterForm, RegisterInput } from './types/auth';

export function registerInput(form: RegisterForm): RegisterInput {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    password: form.password,
  };
}

export function validateRegister(form: RegisterForm): RegisterFieldErrors {
  const input = registerInput(form);
  const errors: RegisterFieldErrors = {};
  if (!input.firstName || input.firstName.length > 100)
    errors.firstName = 'validation:firstNameRequired';
  if (!input.lastName || input.lastName.length > 100)
    errors.lastName = 'validation:lastNameRequired';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254)
    errors.email = 'validation:emailInvalid';
  return { ...errors, ...validatePasswords(input.password, form.confirmPassword) };
}

export function validatePasswords(
  password: string,
  confirmPassword: string,
): Pick<RegisterFieldErrors, 'password' | 'confirmPassword'> {
  const errors: Pick<RegisterFieldErrors, 'password' | 'confirmPassword'> = {};
  if (password.length < 8 || password.length > 128) errors.password = 'validation:passwordLength';
  if (!confirmPassword) errors.confirmPassword = 'validation:confirmPasswordRequired';
  else if (confirmPassword !== password) errors.confirmPassword = 'validation:passwordMismatch';
  return errors;
}
