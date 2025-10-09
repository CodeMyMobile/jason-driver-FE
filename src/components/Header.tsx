import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { classNames } from '../utils/classNames'

interface HeaderProps {
  trackingActive: boolean
}

export function Header({ trackingActive }: HeaderProps): JSX.Element {
  const { driver } = useAuth()

  return (
    <header className="app-header">
      <h1 className="app-title">
        <Link to="/orders" className="app-title-link">
          Jason&apos;s Delivery
        </Link>
      </h1>
      <div className="driver-pill">
        <div className="driver-pill-text">
          <span className="driver-pill-name">{driver?.name ?? 'Driver'}</span>
        </div>
        <div
          className={classNames('tracking-indicator', trackingActive && 'active')}
          title={trackingActive ? 'Location sharing active' : 'Location paused'}
        >
          📡
        </div>
      </div>
    </header>
  )
}
