import { useTranslation } from 'react-i18next';
import { hasErrorCode } from '../../../graphql/client/errors';

export function AdminError({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t } = useTranslation('admin');
  const forbidden = hasErrorCode(error, 'FORBIDDEN');
  const unavailable =
    hasErrorCode(error, 'USER_NOT_FOUND') || hasErrorCode(error, 'VALIDATION_ERROR');
  return (
    <div
      className="admin-panel"
      role="alert"
    >
      <p>{t(forbidden ? 'accessDeniedDescription' : unavailable ? 'unavailable' : 'loadFailed')}</p>
      {!forbidden && !unavailable && retry && (
        <button onClick={retry}>{t('common:actions.retry')}</button>
      )}
    </div>
  );
}
export function AdminLoading({ skeleton = false }: { skeleton?: boolean }) {
  const { t } = useTranslation('admin');
  return (
    <div
      role="status"
      aria-live="polite"
    >
      <p className="text-motory-slate">{t('loading')}</p>
      {skeleton && (
        <>
          <div
            className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-5"
            aria-hidden="true"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="admin-skeleton"
              />
            ))}
          </div>
          <div
            className="admin-panel mt-6"
            aria-hidden="true"
          >
            <div className="admin-skeleton" />
          </div>
        </>
      )}
    </div>
  );
}
