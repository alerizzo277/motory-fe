import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { persistLanguage, resolveLanguage } from './language';
import type { Language } from './language';
import itCommon from './locales/it/common.json';
import itAuth from './locales/it/auth.json';
import itValidation from './locales/it/validation.json';
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enValidation from './locales/en/validation.json';

function updateDocumentLanguage(language: string) {
  document.documentElement.lang = language;
}

i18n.on('languageChanged', updateDocumentLanguage);
void i18n.use(initReactI18next).init({
  resources: {
    it: { common: itCommon, auth: itAuth, validation: itValidation },
    en: { common: enCommon, auth: enAuth, validation: enValidation },
  },
  lng: resolveLanguage(),
  fallbackLng: 'it',
  supportedLngs: ['it', 'en'],
  defaultNS: 'common',
  initAsync: false,
  interpolation: { escapeValue: false },
});

export function selectLanguage(language: Language): void {
  persistLanguage(language);
  void i18n.changeLanguage(language);
}
