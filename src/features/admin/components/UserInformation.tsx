import { useTranslation } from 'react-i18next';
import type { AdminUserSummary } from '../types';

export function Verification({ verified }: { verified: boolean }) {
  const { t } = useTranslation('admin');
  return (
    <span className={`admin-badge ${verified ? 'admin-badge--verified' : ''}`}>
      {t(verified ? 'verified' : 'notVerified')}
    </span>
  );
}
export function Roles({ roles }: { roles: string[] }) {
  const { t } = useTranslation('common');
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <span
          key={role}
          className={
            role === 'ADMIN' ? 'admin-badge admin-badge--admin' : 'text-sm text-motory-slate'
          }
        >
          {t(`home.roles.${role}`, { defaultValue: role })}
        </span>
      ))}
    </span>
  );
}
export function RegistrationDate({ user }: { user: AdminUserSummary }) {
  const { i18n } = useTranslation();
  return (
    <time dateTime={user.createdAt}>
      {new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(
        new Date(user.createdAt),
      )}
    </time>
  );
}
