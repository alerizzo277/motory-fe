import { useQuery } from '@apollo/client/react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ADMIN_USER } from '../api/operations';
import { AdminIcon } from '../components/AdminIcon';
import { AdminError, AdminLoading } from '../components/AdminFeedback';
import { RegistrationDate, Roles, Verification } from '../components/UserInformation';
import { Statistics } from '../components/Statistics';

export function AdminUserPage() {
  const { id = '' } = useParams();
  return (
    <UserDetail
      key={id}
      id={id}
    />
  );
}
function UserDetail({ id }: { id: string }) {
  const { t } = useTranslation('admin');
  const { data, loading, error, refetch } = useQuery(ADMIN_USER, {
    variables: { id },
    fetchPolicy: 'no-cache',
  });
  const user = data?.adminUser;
  return (
    <>
      <Link
        className="admin-icon-action mb-4"
        to="/admin/users"
        title={t('backUsers')}
        aria-label={t('backUsers')}
      >
        <AdminIcon kind="back" />
      </Link>
      <header className="admin-heading">
        <h1>{t('userDetails')}</h1>
        <p>{t('userDetailsSubtitle')}</p>
      </header>
      {loading ? (
        <AdminLoading />
      ) : error || !user ? (
        <AdminError
          error={error}
          retry={() => {
            void refetch().catch(() => undefined);
          }}
        />
      ) : (
        <>
          <section className="admin-panel">
            <h2 className="admin-section-title">
              {user.firstName} {user.lastName}
            </h2>
            <dl className="admin-account grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <dt>{t('common:fields.firstName')}</dt>
                <dd>{user.firstName}</dd>
              </div>
              <div>
                <dt>{t('common:fields.lastName')}</dt>
                <dd>{user.lastName}</dd>
              </div>
              <div>
                <dt>{t('email')}</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>{t('registered')}</dt>
                <dd>
                  <RegistrationDate user={user} />
                </dd>
              </div>
              <div>
                <dt>{t('verification')}</dt>
                <dd>
                  <Verification verified={user.emailVerified} />
                </dd>
              </div>
              <div>
                <dt>{t('roles')}</dt>
                <dd>
                  <Roles roles={user.roles} />
                </dd>
              </div>
            </dl>
          </section>
          <section className="mt-6">
            <h2 className="admin-section-title">{t('activity')}</h2>
            <Statistics
              metrics={[
                {
                  label: 'activeVehicles',
                  value: user.activity.activeVehiclesCount,
                  icon: 'vehicle',
                },
                {
                  label: 'deletedVehicles',
                  value: user.activity.deletedVehiclesCount,
                  icon: 'deleted',
                },
                {
                  label: 'totalMaintenanceEvents',
                  value: user.activity.totalMaintenanceEventsCount,
                  icon: 'events',
                },
              ]}
            />
          </section>
        </>
      )}
    </>
  );
}
