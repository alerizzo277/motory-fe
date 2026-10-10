import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function VehicleNavigation({ onEdit }: { onEdit?: () => void }) {
  const { t } = useTranslation('vehicles');
  return (
    <div className="vehicle-navigation">
      <Link
        className="vehicle-icon-action"
        to="/home"
        title={t('backHome')}
        aria-label={t('backHome')}
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
      {onEdit && (
        <button
          type="button"
          className="vehicle-icon-action"
          title={t('edit')}
          aria-label={t('edit')}
          onClick={onEdit}
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
            <path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5" />
          </svg>
        </button>
      )}
    </div>
  );
}
