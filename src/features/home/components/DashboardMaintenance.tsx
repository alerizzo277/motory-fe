import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, MAINTENANCE_EVENTS } from '../../maintenance-events/api/operations';
import { maintenanceErrorKey } from '../../maintenance-events/api/errors';
import { CATEGORY_CODES } from '../../maintenance-events/types';
import type { Vehicle } from '../../vehicles/types';
import { deadlineStatus, upcomingEvents, recentEvents } from '../maintenance';

export function DashboardMaintenance({ vehicle }: { vehicle: Vehicle }) {
  const { t, i18n } = useTranslation('maintenance');
  const eventsQuery = useQuery(MAINTENANCE_EVENTS, {
    variables: { vehicleId: vehicle.id },
    fetchPolicy: 'network-only',
  });
  const categoriesQuery = useQuery(CATEGORIES);
  const loading = eventsQuery.loading || categoriesQuery.loading;
  const error = eventsQuery.error || categoriesQuery.error;
  const events = (eventsQuery.data?.maintenanceEvents ?? []).filter(
    (event) => event.vehicleId === vehicle.id,
  );
  const sections = {
    upcoming: upcomingEvents(events, vehicle.latestOdometerKm),
    recent: recentEvents(events),
  };
  const date = (value: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(value),
    );
  const mileage = (value: number) =>
    t('kilometers', { value: new Intl.NumberFormat(i18n.resolvedLanguage).format(value) });
  return (
    <div className="dashboard__maintenance">
      {(['upcoming', 'recent'] as const).map((section) => (
        <section
          key={section}
          aria-labelledby={`${section}-title`}
        >
          <h2
            className="vehicle-eyebrow"
            id={`${section}-title`}
          >
            {t(`vehicles:${section}`)}
          </h2>
          {loading ? (
            <p role="status">{t('dashboardLoading')}</p>
          ) : error ? (
            <div className="vehicle-panel">
              <p role="alert">
                {t(
                  maintenanceErrorKey(error) === 'auth:errors.unauthenticated'
                    ? 'auth:errors.unauthenticated'
                    : 'dashboardError',
                )}
              </p>
              <button
                onClick={() => {
                  void Promise.allSettled([eventsQuery.refetch(), categoriesQuery.refetch()]);
                }}
              >
                {t('retry')}
              </button>
            </div>
          ) : sections[section].length === 0 ? (
            <div className="vehicle-panel vehicle-empty">
              <p>{t(`vehicles:${section}Empty`)}</p>
            </div>
          ) : (
            <ul className="maintenance-list">
              {sections[section].map((event) => {
                const code = categoriesQuery.data?.categories.find(
                  (category) => category.id === event.categoryId,
                )?.code;
                const category =
                  code && CATEGORY_CODES.some((categoryCode) => categoryCode === code)
                    ? t(`categories.${code}`)
                    : t('unknownCategory');
                const scheduled = section === 'upcoming';
                const eventDate = scheduled ? event.scheduledDate : event.executionDate;
                const eventMileage = scheduled ? event.scheduledOdometerKm : event.odometerKm;
                const urgency = deadlineStatus(event, vehicle.latestOdometerKm);
                return (
                  <li key={event.id}>
                    <Link
                      className="maintenance-card vehicle-panel"
                      to={`/maintenance-events/${event.id}`}
                      aria-label={t('viewEvent', { name: event.name })}
                    >
                      <h3>{event.name}</h3>
                      <p className="maintenance-card__category">{category}</p>
                      {scheduled && (
                        <span className={`maintenance-deadline maintenance-deadline--${urgency}`}>
                          {t(`deadlines.${urgency}`)}
                        </span>
                      )}
                      <dl>
                        {eventDate && (
                          <div>
                            <dt>{t(`fields.${scheduled ? 'scheduledDate' : 'executionDate'}`)}</dt>
                            <dd>{date(eventDate)}</dd>
                          </div>
                        )}
                        {eventMileage !== null && (
                          <div>
                            <dt>
                              {t(`fields.${scheduled ? 'scheduledOdometerKm' : 'odometerKm'}`)}
                            </dt>
                            <dd>{mileage(eventMileage)}</dd>
                          </div>
                        )}
                        {!scheduled && event.cost !== null && (
                          <div>
                            <dt>{t('fields.cost')}</dt>
                            <dd>
                              {new Intl.NumberFormat(i18n.resolvedLanguage, {
                                style: 'currency',
                                currency: 'EUR',
                              }).format(Number(event.cost))}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
