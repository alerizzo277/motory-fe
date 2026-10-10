import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/hooks/useAuth';
import { SettingsLayout } from '../components/SettingsLayout';
import { SettingsIcon } from '../components/SettingsIcon';

export function SettingsPage() {
  const { t } = useTranslation('settings');
  const { user } = useAuth();
  return (
    <SettingsLayout
      title={t('title')}
      home
    >
      <section
        className="vehicle-panel flex min-w-0 flex-col gap-2"
        aria-label={t('account')}
      >
        <h2 className="settings-title">
          {user?.firstName} {user?.lastName}
        </h2>
        <p className="settings-text text-motory-slate">{user?.email}</p>
        {user?.role === 'ADMIN' && (
          <span className="settings-admin self-start">{t('administrator')}</span>
        )}
      </section>
      <section
        className="flex min-w-0 flex-col gap-3"
        aria-labelledby="account-title"
      >
        <h2
          id="account-title"
          className="settings-section-title text-sm uppercase tracking-wider text-motory-slate"
        >
          {t('account')}
        </h2>
        {(
          [
            { title: 'profile', path: '/settings/profile', icon: 'person' },
            { title: 'deletedVehicles', path: '/settings/deleted-vehicles', icon: 'deleted' },
          ] as const
        ).map((entry) => (
          <Link
            key={entry.path}
            to={entry.path}
            className="settings-entry vehicle-panel flex min-w-0 items-center gap-3"
          >
            <SettingsIcon kind={entry.icon} />
            <span className="min-w-0 flex-1 font-semibold">{t(entry.title)}</span>
            <SettingsIcon kind="chevron" />
          </Link>
        ))}
      </section>
    </SettingsLayout>
  );
}
