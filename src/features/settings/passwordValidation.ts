import { validatePasswords } from '../auth/registerValidation.ts';

export interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
export function validatePasswordChange(input: PasswordChangeForm) {
  const errors: Partial<Record<keyof PasswordChangeForm, string>> = {};
  if (!input.currentPassword) errors.currentPassword = 'validation:passwordRequired';
  else if (input.currentPassword.length > 128)
    errors.currentPassword = 'validation:passwordMaxLength';
  const newPasswordErrors = validatePasswords(input.newPassword, input.confirmPassword);
  if (newPasswordErrors.password) errors.newPassword = newPasswordErrors.password;
  if (newPasswordErrors.confirmPassword) errors.confirmPassword = newPasswordErrors.confirmPassword;
  if (input.newPassword && input.newPassword === input.currentPassword)
    errors.newPassword = 'settings:security.errors.unchanged';
  return errors;
}
