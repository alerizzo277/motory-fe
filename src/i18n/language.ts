export type Language = 'it' | 'en';
export const LANGUAGE_STORAGE_KEY = 'motory_language';

export function isLanguage(value: unknown): value is Language {
  return value === 'it' || value === 'en';
}

export function resolveLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Storage may be disabled; browser preferences still work.
  }
  const primary =
    typeof navigator === 'undefined' ? '' : navigator.language.toLowerCase().split('-')[0];
  return isLanguage(primary) ? primary : 'it';
}

export function persistLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // A manual selection still applies for this visit when storage is unavailable.
  }
}
