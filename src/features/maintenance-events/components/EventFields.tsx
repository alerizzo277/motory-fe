import { useTranslation } from 'react-i18next';
import { CategoryInformation } from './CategoryInformation';
import type { Category, MaintenanceDraft, MaintenanceErrors, ScheduledDraft } from '../types';
import { CATEGORY_CODES } from '../types';
import { utcToday } from '../validation';
interface EventFieldsProps {
  draft: MaintenanceDraft | ScheduledDraft;
  categories: Category[];
  errors: MaintenanceErrors;
  prefix: string;
  onChange: (name: keyof MaintenanceDraft, value: string) => void;
}
export function EventFields({ draft, categories, errors, prefix, onChange }: EventFieldsProps) {
  const { t } = useTranslation('maintenance');
  const executed = 'status' in draft && draft.status === 'EXECUTED';
  const names: (keyof MaintenanceDraft)[] = [
    'name',
    'categoryId',
    ...(executed
      ? (['executionDate', 'odometerKm', 'cost', 'provider'] as const)
      : (['scheduledDate', 'scheduledOdometerKm'] as const)),
    'notes',
  ];
  return (
    <div className="maintenance-fields">
      {names.map((name) => {
        const id = `${prefix}-${name}`;
        const value = name in draft ? draft[name as keyof typeof draft] : '';
        const required = name === 'name' || name === 'categoryId' || name === 'executionDate';
        const dateField = name === 'scheduledDate' || name === 'executionDate';
        const mileage = name === 'odometerKm' || name === 'scheduledOdometerKm';
        const description =
          [
            errors[name] ? `${id}-error` : '',
            !executed && (dateField || mileage) ? `${prefix}-deadline-help` : '',
            name === 'cost' ? `${id}-help` : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined;
        return (
          <div
            className="maintenance-field"
            key={name}
          >
            <div className="maintenance-field__label">
              <label htmlFor={id}>
                {t(`fields.${name}`)}
                {!required ? ` (${t('optional')})` : ''}
              </label>
              {name === 'categoryId' && <CategoryInformation />}
            </div>
            {name === 'categoryId' ? (
              <select
                id={id}
                name={name}
                required
                value={value}
                onChange={(event) => onChange(name, event.target.value)}
                aria-invalid={!!errors[name]}
                aria-describedby={description}
              >
                <option value="">{t('chooseCategory')}</option>
                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {CATEGORY_CODES.some((code) => code === category.code)
                      ? t(`categories.${category.code}`)
                      : t('unknownCategory')}
                  </option>
                ))}
              </select>
            ) : name === 'notes' ? (
              <textarea
                id={id}
                name={name}
                rows={4}
                maxLength={10000}
                value={value}
                onChange={(event) => onChange(name, event.target.value)}
                aria-invalid={!!errors[name]}
                aria-describedby={description}
              />
            ) : (
              <input
                id={id}
                name={name}
                type={dateField ? 'date' : mileage ? 'number' : 'text'}
                inputMode={mileage ? 'numeric' : name === 'cost' ? 'decimal' : undefined}
                min={mileage ? 0 : undefined}
                max={mileage ? 2147483647 : name === 'executionDate' ? utcToday() : undefined}
                step={mileage ? 1 : undefined}
                maxLength={name === 'name' || name === 'provider' ? 200 : undefined}
                required={required}
                value={value}
                onChange={(event) => onChange(name, event.target.value)}
                aria-invalid={!!errors[name]}
                aria-describedby={description}
              />
            )}
            {name === 'cost' && (
              <p
                className="maintenance-hint"
                id={`${id}-help`}
              >
                {t('costHint')}
              </p>
            )}
            {errors[name] && (
              <p
                className="error"
                role="alert"
                id={`${id}-error`}
              >
                {t(errors[name])}
              </p>
            )}
          </div>
        );
      })}
      {!executed && (
        <p
          id={`${prefix}-deadline-help`}
          className={errors.deadline ? 'error' : 'maintenance-hint'}
          role={errors.deadline ? 'alert' : undefined}
        >
          {t(errors.deadline ?? 'deadlineHint')}
        </p>
      )}
    </div>
  );
}
