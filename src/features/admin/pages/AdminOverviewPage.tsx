import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ADMIN_DASHBOARD } from '../api/operations';
import { AdminError, AdminLoading } from '../components/AdminFeedback';
import { Statistics } from '../components/Statistics';
import { UsersList } from '../components/UsersList';

export function AdminOverviewPage() {
  const { t } = useTranslation('admin');
  const { data, loading, error, refetch } = useQuery(ADMIN_DASHBOARD, { fetchPolicy: 'no-cache' });
  const dashboard = data?.adminDashboard;
  return (
    <>
      <header className="admin-heading">
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </header>
      {loading ? (
        <AdminLoading skeleton />
      ) : error || !dashboard ? (
        <AdminError
          error={error}
          retry={() => {
            void refetch().catch(() => undefined);
          }}
        />
      ) : (
        <>
          <Statistics
            metrics={[
              { label: 'totalUsers', value: dashboard.totalUsers, icon: 'users' },
              { label: 'verifiedUsers', value: dashboard.verifiedUsers, icon: 'verified' },
              { label: 'activeVehicles', value: dashboard.activeVehicles, icon: 'vehicle' },
              { label: 'deletedVehicles', value: dashboard.deletedVehicles, icon: 'deleted' },
              {
                label: 'totalMaintenanceEvents',
                value: dashboard.totalMaintenanceEvents,
                icon: 'events',
              },
            ]}
          />
          <section className="admin-panel mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="admin-section-title">{t('recentUsers')}</h2>
              <Link
                className="admin-text-link"
                to="/admin/users"
              >
                {t('viewAll')}
              </Link>
            </div>
            {dashboard.recentUsers.length ? (
              <UsersList users={dashboard.recentUsers} />
            ) : (
              <p className="text-motory-slate">{t('noRecentUsers')}</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
