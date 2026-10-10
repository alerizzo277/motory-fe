import itAdmin from './locales/it/admin.json';
import enAdmin from './locales/en/admin.json';
import itMaintenance from './locales/it/maintenance.json';
import enMaintenance from './locales/en/maintenance.json';
import itSettings from './locales/it/settings.json';
import enSettings from './locales/en/settings.json';
import itVehicles from './locales/it/vehicles.json';
import enVehicles from './locales/en/vehicles.json';
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
    it: {
      admin: itAdmin,
      settings: itSettings,
      maintenance: itMaintenance,
      vehicles: itVehicles,
      common: itCommon,
      auth: itAuth,
      validation: itValidation,
    },
    en: {
      admin: enAdmin,
      settings: enSettings,
      maintenance: enMaintenance,
      vehicles: enVehicles,
      common: enCommon,
      auth: enAuth,
      validation: enValidation,
    },
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
