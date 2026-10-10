import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useTranslation } from 'react-i18next';
import { ADMIN_USERS } from '../api/operations';
import { AdminError, AdminLoading } from '../components/AdminFeedback';
import { AdminIcon } from '../components/AdminIcon';
import { UsersList, UsersTable } from '../components/UsersList';

export function AdminUsersPage() {
  const { t, i18n } = useTranslation('admin');
  const [search, setSearch] = useState('');
  const [request, setRequest] = useState({ search: '', page: 1 });
  const normalized = search.trim();
  const pendingSearch = normalized !== request.search;
  useEffect(() => {
    if (!pendingSearch) return;
    const timer = window.setTimeout(() => setRequest({ search: normalized, page: 1 }), 300);
    return () => window.clearTimeout(timer);
  }, [normalized, pendingSearch]);
  return (
    <>
      <header className="admin-heading">
        <h1>{t('usersTitle')}</h1>
        <p>{t('usersSubtitle')}</p>
      </header>
      <div className="mb-5 max-w-xl">
        <label htmlFor="admin-search">{t('searchLabel')}</label>
        <input
          id="admin-search"
          type="search"
          value={search}
          placeholder={t('searchPlaceholder')}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {/* A query instance per variable set prevents previous data or late responses from appearing as current results. */}
      <UsersResults
        key={`${request.page}:${request.search}`}
        request={request}
        pendingSearch={pendingSearch}
        onPage={(page) => setRequest({ ...request, page })}
        formatNumber={(value) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)}
      />
    </>
  );
}
function UsersResults({
  request,
  pendingSearch,
  onPage,
  formatNumber,
}: {
  request: { search: string; page: number };
  pendingSearch: boolean;
  onPage: (page: number) => void;
  formatNumber: (value: number) => string;
}) {
  const { t } = useTranslation('admin');
  const { data, loading, error, refetch } = useQuery(ADMIN_USERS, {
    variables: { ...request, pageSize: 20 },
    fetchPolicy: 'no-cache',
  });
  const result = !loading && !error ? data?.adminUsers : undefined;
  const lastPage = result ? Math.max(1, result.totalPages) : request.page;
  const outOfRange = !!result && request.page > lastPage;
  useEffect(() => {
    if (outOfRange) onPage(lastPage);
  }, [outOfRange, lastPage, onPage]);
  const busy = loading || pendingSearch || outOfRange;
  return (
    <>
      {busy ? (
        <AdminLoading />
      ) : error || !result ? (
        <AdminError
          error={error}
          retry={() => {
            void refetch().catch(() => undefined);
          }}
        />
      ) : result.items.length ? (
        <div className="admin-panel admin-results">
          <div className="hidden xl:block">
            <UsersTable users={result.items} />
          </div>
          <div className="xl:hidden">
            <UsersList users={result.items} />
          </div>
        </div>
      ) : (
        <div className="admin-panel">
          <p>{t('noUsers')}</p>
        </div>
      )}
      <nav
        className="admin-pagination mt-5 flex flex-wrap items-center justify-between gap-3"
        aria-label={t('pagination')}
      >
        <div className="flex shrink-0 gap-2">
          <button
            title={t('previous')}
            aria-label={t('previous')}
            disabled={busy || request.page <= 1}
            onClick={() => onPage(request.page - 1)}
          >
            <span className="rotate-180">
              <AdminIcon kind="next" />
            </span>
          </button>
          <button
            title={t('next')}
            aria-label={t('next')}
            disabled={busy || !result || request.page >= result.totalPages}
            onClick={() => onPage(request.page + 1)}
          >
            <AdminIcon kind="next" />
          </button>
        </div>
        <div
          className="min-w-0 flex-1 text-right text-sm text-motory-slate"
          aria-live="polite"
        >
          {!busy && result && (
            <>
              <p>
                {result.totalPages
                  ? t('pageOf', {
                      page: formatNumber(result.page),
                      pages: formatNumber(result.totalPages),
                    })
                  : t('noPages')}
              </p>
              <p>
                {t('matchingUsers', {
                  count: result.totalCount,
                  total: formatNumber(result.totalCount),
                })}
              </p>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
