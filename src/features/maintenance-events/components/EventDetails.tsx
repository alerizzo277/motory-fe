import { useTranslation } from 'react-i18next';
import type { Category, MaintenanceEvent } from '../types';
import { CATEGORY_CODES } from '../types';
export function EventDetails({
  event,
  categories,
}: {
  event: MaintenanceEvent;
  categories: Category[];
}) {
  const { t, i18n } = useTranslation('maintenance');
  const locale = i18n.resolvedLanguage;
  const category = categories.find((category) => category.id === event.categoryId);
  function value(field: keyof MaintenanceEvent) {
    const raw = event[field];
    if (raw === null || raw === '') return t('unspecified');
    if (field === 'scheduledDate' || field === 'executionDate')
      return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(String(raw)),
      );
    if (field === 'scheduledOdometerKm' || field === 'odometerKm')
      return t('kilometers', { value: new Intl.NumberFormat(locale).format(Number(raw)) });
    if (field === 'cost')
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(raw));
    return raw;
  }
  function facts(fields: (keyof MaintenanceEvent)[]) {
    return (
      <dl className="maintenance-facts">
        {fields.map((field) => (
          <div key={field}>
            <dt>{t(`fields.${field}`)}</dt>
            <dd>{value(field)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <>
      <dl className="maintenance-facts">
        <div>
          <dt>{t('fields.status')}</dt>
          <dd>{t(`statuses.${event.status}`)}</dd>
        </div>
        <div>
          <dt>{t('fields.categoryId')}</dt>
          <dd>
            {category && CATEGORY_CODES.some((code) => code === category.code)
              ? t(`categories.${category.code}`)
              : t('unknownCategory')}
          </dd>
        </div>
      </dl>
      {event.status === 'SCHEDULED' ? (
        facts(['scheduledDate', 'scheduledOdometerKm'])
      ) : (
        <>
          <h2>{t('execution')}</h2>
          {facts(['executionDate', 'odometerKm', 'cost', 'provider'])}
          {(event.scheduledDate !== null || event.scheduledOdometerKm !== null) && (
            <>
              <h2>{t('originalPlan')}</h2>
              {facts(['scheduledDate', 'scheduledOdometerKm'])}
            </>
          )}
        </>
      )}
      {facts(['notes'])}
    </>
  );
}
