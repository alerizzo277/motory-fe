import { hasErrorCode, validationErrorFields } from '../../../graphql/client/errors.ts';
import type { RegisterFieldErrors } from '../types/auth';

const fieldMessages = {
  firstName: 'Inserisci un nome valido (massimo 100 caratteri).',
  lastName: 'Inserisci un cognome valido (massimo 100 caratteri).',
  email: 'Inserisci un’email valida (massimo 254 caratteri).',
  password: 'Inserisci una password da 8 a 128 caratteri.',
};

export function registerErrors(error: unknown): {
  fields: RegisterFieldErrors;
  message: string | null;
} {
  if (hasErrorCode(error, 'EMAIL_ALREADY_EXISTS')) {
    return { fields: { email: 'Esiste già un account associato a questa email.' }, message: null };
  }
  if (hasErrorCode(error, 'VALIDATION_ERROR')) {
    const fields: RegisterFieldErrors = {};
    for (const field of validationErrorFields(error)) {
      if (Object.hasOwn(fieldMessages, field)) {
        const key = field as keyof typeof fieldMessages;
        fields[key] = fieldMessages[key];
      }
    }
    return { fields, message: 'Controlla i dati inseriti e riprova.' };
  }
  return { fields: {}, message: 'Si è verificato un errore. Riprova.' };
}
