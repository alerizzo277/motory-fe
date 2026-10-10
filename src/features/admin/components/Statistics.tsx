import { useTranslation } from 'react-i18next';
import { AdminIcon, type AdminIconKind } from './AdminIcon';
export interface Metric {
  label: string;
  value: number;
  icon: AdminIconKind;
}
export function Statistics({ metrics }: { metrics: Metric[] }) {
  const { t, i18n } = useTranslation('admin');
  return (
    <dl
      className={`grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 ${metrics.length === 5 ? 'xl:grid-cols-5' : 'md:grid-cols-3'}`}
    >
      {metrics.map((metric) => (
        <div
          className="admin-panel admin-metric"
          key={metric.label}
        >
          <dt>
            <span className="admin-metric-icon">
              <AdminIcon kind={metric.icon} />
            </span>
            {t(metric.label)}
          </dt>
          <dd>{new Intl.NumberFormat(i18n.resolvedLanguage).format(metric.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
