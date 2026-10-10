import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AdminUserSummary } from '../types';
import { AdminIcon } from './AdminIcon';
import { RegistrationDate, Roles, Verification } from './UserInformation';

export function UsersList({ users }: { users: AdminUserSummary[] }) {
  const { t } = useTranslation('admin');
  return (
    <ul className="admin-user-list">
      {users.map((user) => (
        <li key={user.id}>
          <Link
            className="admin-user-card"
            to={`/admin/users/${user.id}`}
          >
            <div className="min-w-0">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <p className="admin-email">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-motory-slate">
                <RegistrationDate user={user} />
                <Verification verified={user.emailVerified} />
                {user.roles.includes('ADMIN') && <Roles roles={['ADMIN']} />}
              </div>
            </div>
            <span
              className="shrink-0"
              aria-label={t('detailsFor', { name: `${user.firstName} ${user.lastName}` })}
            >
              <AdminIcon kind="next" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
export function UsersTable({ users }: { users: AdminUserSummary[] }) {
  const { t } = useTranslation('admin');
  return (
    <table className="admin-table">
      <caption className="sr-only">{t('usersTitle')}</caption>
      <thead>
        <tr>
          {['user', 'email', 'registered', 'verification', 'roles', 'details'].map((key) => (
            <th
              scope="col"
              key={key}
            >
              {t(key)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <th scope="row">
              {user.firstName} {user.lastName}
            </th>
            <td>{user.email}</td>
            <td>
              <RegistrationDate user={user} />
            </td>
            <td>
              <Verification verified={user.emailVerified} />
            </td>
            <td>
              <Roles roles={user.roles} />
            </td>
            <td>
              <Link
                className="admin-icon-action"
                to={`/admin/users/${user.id}`}
                aria-label={t('detailsFor', { name: `${user.firstName} ${user.lastName}` })}
                title={t('detailsFor', { name: `${user.firstName} ${user.lastName}` })}
              >
                <AdminIcon kind="next" />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
