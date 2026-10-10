import { useTranslation } from 'react-i18next';
import logo from '../../assets/brand/logo.svg';
import './BrandLogo.css';

export function BrandLogo() {
  const { t } = useTranslation();
  return (
    <div className="brand-logo">
      <img
        src={logo}
        alt="Motory"
        width={720}
        height={166}
      />
      <p>{t('common:brand.tagline')}</p>
    </div>
  );
}
