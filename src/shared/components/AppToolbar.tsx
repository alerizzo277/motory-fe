import { useTranslation } from 'react-i18next';
import { BrandLogo } from './BrandLogo';
import { selectLanguage } from '../../i18n';
import { isLanguage } from '../../i18n/language';
import './AppToolbar.css';

export function AppToolbar() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'it';
  return (
    <header className="app-toolbar">
      <BrandLogo />
      <div className="app-toolbar__language">
        <span aria-hidden="true">{language.toUpperCase()}</span>
        <select
          aria-label={t('common:toolbar.language')}
          value={language}
          onChange={(event) => {
            if (isLanguage(event.target.value)) selectLanguage(event.target.value);
          }}
        >
          <option
            value="it"
            lang="it"
          >
            {t('common:toolbar.italian')}
          </option>
          <option
            value="en"
            lang="en"
          >
            {t('common:toolbar.english')}
          </option>
        </select>
      </div>
    </header>
  );
}
