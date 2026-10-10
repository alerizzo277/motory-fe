import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SettingsIcon } from './SettingsIcon';
import '../../vehicles/vehicles.css';
import '../settings.css';

export function SettingsLayout({
  title,
  home = false,
  action,
  children,
}: {
  title: string;
  home?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation('settings');
  const back = home ? t('backHome') : t('backSettings');
  return (
    <main className="settings-page mx-auto flex w-full max-w-[960px] min-w-0 flex-col gap-6 self-start">
      <div className="flex items-center justify-between gap-3">
        <Link
          className="vehicle-icon-action"
          to={home ? '/home' : '/settings'}
          title={back}
          aria-label={back}
        >
          <SettingsIcon kind="back" />
        </Link>
        {action}
      </div>
      <h1 className="settings-title">{title}</h1>
      {children}
    </main>
  );
}
