import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export function MaintenanceNavigation({
  onEdit,
  onDelete,
  busy = false,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const { t } = useTranslation('maintenance');
  return (
    <div className="maintenance-navigation">
      <Link
        className="maintenance-icon"
        to="/home"
        title={t('backHome')}
        aria-label={t('backHome')}
        aria-disabled={busy || undefined}
        onClick={(event) => {
          if (busy) event.preventDefault();
        }}
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
      <div className="flex items-center gap-2">
        {onEdit && (
          <button
            type="button"
            className="maintenance-icon"
            title={t('edit')}
            aria-label={t('edit')}
            disabled={busy}
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
        {onDelete && (
          <button
            type="button"
            className="maintenance-icon maintenance-destructive-icon"
            title={t('delete')}
            aria-label={t('delete')}
            disabled={busy}
            onClick={onDelete}
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
              <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
