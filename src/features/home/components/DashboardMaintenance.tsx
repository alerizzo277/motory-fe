import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, MAINTENANCE_EVENTS } from '../../maintenance-events/api/operations';
import { maintenanceErrorKey } from '../../maintenance-events/api/errors';
import { CATEGORY_CODES } from '../../maintenance-events/types';
import type { Vehicle } from '../../vehicles/types';
import { deadlineStatus, upcomingEvents, recentEvents } from '../maintenance';

export function DashboardMaintenance({ vehicle }: { vehicle: Vehicle }) {
  const [expanded, setExpanded] = useState({ upcoming: false, recent: false });
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
    upcoming: upcomingEvents(events, vehicle.latestOdometerKm, undefined, events.length),
    recent: recentEvents(events, events.length),
  };
  const date = (value: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(value),
    );
  const mileage = (value: number) =>
    t('kilometers', { value: new Intl.NumberFormat(i18n.resolvedLanguage).format(value) });
  return (
    <div className="dashboard__maintenance flex flex-col gap-8">
      {(['upcoming', 'recent'] as const).map((section) => (
        <section
          key={section}
          className="flex min-w-0 flex-col gap-3"
          aria-labelledby={`${section}-title`}
        >
          <h2
            className="dashboard-heading"
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
            <>
              <ul
                id={`${section}-timeline`}
                className="maintenance-list m-0 list-none p-0"
              >
                {sections[section].slice(0, expanded[section] ? undefined : 5).map((event) => {
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
                    <li
                      key={event.id}
                      className={`timeline-item timeline-item--${scheduled ? urgency : 'completed'}`}
                    >
                      <Link
                        className="maintenance-card flex min-w-0 flex-col gap-2 py-4 pl-8 pr-4 text-motory-navy no-underline"
                        to={`/maintenance-events/${event.id}`}
                        aria-label={t('viewEvent', { name: event.name })}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="maintenance-card__title">{event.name}</h3>

                          {scheduled && (
                            <span
                              className={`maintenance-deadline maintenance-deadline--${urgency}`}
                            >
                              {t(`deadlines.${urgency}`)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-motory-slate">{category}</p>
                        <dl className="m-0 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                          {eventDate && (
                            <div>
                              <dt className="text-motory-slate">
                                {t(`fields.${scheduled ? 'scheduledDate' : 'executionDate'}`)}
                              </dt>
                              <dd className="m-0 font-medium">{date(eventDate)}</dd>
                            </div>
                          )}
                          {eventMileage !== null && (
                            <div>
                              <dt className="text-motory-slate">
                                {t(`fields.${scheduled ? 'scheduledOdometerKm' : 'odometerKm'}`)}
                              </dt>
                              <dd className="m-0 font-medium">{mileage(eventMileage)}</dd>
                            </div>
                          )}
                          {!scheduled && event.cost !== null && (
                            <div>
                              <dt className="text-motory-slate">{t('fields.cost')}</dt>
                              <dd className="m-0 font-medium">
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
              {sections[section].length > 5 && (
                <button
                  className="dashboard-expand self-start"
                  aria-expanded={expanded[section]}
                  aria-controls={`${section}-timeline`}
                  onClick={() =>
                    setExpanded((current) => ({ ...current, [section]: !current[section] }))
                  }
                >
                  {t(expanded[section] ? 'showLess' : 'showMore')}
                </button>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
