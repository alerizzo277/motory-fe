import logo from '../../assets/brand/logo.svg'
import './BrandLogo.css'

export function BrandLogo() {
  return (
    <div className="brand-logo">
      <img src={logo} alt="Motory" width={720} height={166} />
      <p lang="en">Your car's story</p>
    </div>
  )
}
