import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function ResourceUnavailable() {
  const { t } = useTranslation('common');
  return (
    <>
      <Link
        className="vehicle-icon-action"
        to="/home"
        title={t('actions.backHome')}
        aria-label={t('actions.backHome')}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M19 12H5m7-7-7 7 7 7" />
        </svg>
      </Link>
      <h1>{t('resourceUnavailableTitle')}</h1>
      <p role="alert">{t('errors.resourceUnavailable')}</p>
    </>
  );
}
