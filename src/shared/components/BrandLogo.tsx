import logo from '../../assets/brand/logo-full.svg';
import './BrandLogo.css';

export function BrandLogo() {
  return (
    <div className="brand-logo">
      <img
        src={logo}
        alt="Motory"
        width={720}
        height={166}
      />
    </div>
  );
}
