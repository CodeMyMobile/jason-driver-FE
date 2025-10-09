import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { classNames } from '../utils/classNames.ts'

const statusLabels = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  ON_DELIVERY: 'On Delivery',
}

export default function Header({ trackingActive }) {
  const { driver } = useAuth()

  return (
    <header className="driver-shell__header">
      <div className="driver-shell__brand">
        <Link to="/orders" className="driver-shell__brand-link">
          Jason&apos;s Delivery
        </Link>
        <span className="driver-shell__brand-subtitle">Driver Portal</span>
      </div>
      <div className="driver-shell__status">
        <div className="driver-shell__status-text">
          <span className="driver-shell__status-name">{driver?.name ?? 'Driver'}</span>
          <span>{driver ? statusLabels[driver.status] : 'Offline'}</span>
        </div>
        <div
          className={classNames(
            'driver-shell__tracking-chip',
            trackingActive && 'driver-shell__tracking-chip--active',
          )}
          title={trackingActive ? 'Location sharing active' : 'Location paused'}
        >
          📡
        </div>
      </div>
    </header>
  )
}
