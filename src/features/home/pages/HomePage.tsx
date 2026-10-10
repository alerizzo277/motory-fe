import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/hooks/useAuth';
export function HomePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <main className="card">
      <h1>{t('common:home.title')}</h1>
      <p>{t('common:home.development')}</p>
      <h2>{t('common:home.welcome', { name: `${user.firstName} ${user.lastName}` })}</h2>
      <p>{user.email}</p>
      <p>
        {t('common:home.role', {
          role: t(`common:home.roles.${user.role}`, { defaultValue: user.role }),
        })}
      </p>
      <button
        onClick={() => {
          void logout();
        }}
      >
        {t('common:actions.logout')}
      </button>
    </main>
  );
}
