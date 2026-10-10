import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasAdminRole } from '../../auth/roles';
import { AdminIcon } from './AdminIcon';
import '../admin.css';

export function AdminLayout() {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  if (!hasAdminRole(user))
    return (
      <main className="card self-start">
        <h1>{t('accessDenied')}</h1>
        <p role="alert">{t('accessDeniedDescription')}</p>
      </main>
    );
  return (
    <div className="admin-layout mx-auto grid w-full max-w-[1360px] min-w-0 gap-6 self-start lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-8">
      <aside className="min-w-0">
        <p className="admin-section-label">{t('title')}</p>
        <nav
          aria-label={t('navigation')}
          className="flex gap-2 lg:flex-col"
        >
          <NavLink
            to="/admin"
            end
            className="admin-nav-link"
          >
            <AdminIcon kind="overview" />
            {t('overview')}
          </NavLink>
          <NavLink
            to="/admin/users"
            className="admin-nav-link"
          >
            <AdminIcon kind="users" />
            {t('users')}
          </NavLink>
        </nav>
      </aside>
      <main className="admin-main min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
