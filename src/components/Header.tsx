import { Link } from 'react-router-dom'
import { DriverStatus } from '../types'
import { useAuth } from '../hooks/useAuth'
import { classNames } from '../utils/classNames'

interface HeaderProps {
  trackingActive: boolean
}

const statusLabels: Record<DriverStatus, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  ON_DELIVERY: 'On Delivery',
}

export function Header({ trackingActive }: HeaderProps): JSX.Element {
  const { driver } = useAuth()

  return (
    <header className="app-header">
      <h1 className="app-title">
        <Link to="/orders" className="app-title-link">
          <span className="app-title-badge">Jason&apos;s Delivery</span>
          <span className="app-title-subtitle">Driver Portal</span>
        </Link>
      </h1>
      <div className="driver-pill" aria-live="polite">
        <div className="driver-pill-status-group">
          <span
            className={classNames(
              'status-dot',
              driver?.status === 'ONLINE' && 'online',
              driver?.status === 'ON_DELIVERY' && 'onduty',
              driver?.status === 'OFFLINE' && 'offline',
            )}
            aria-hidden
          />
          <div className="driver-pill-text">
            <span className="driver-pill-label">{driver?.name ?? 'Driver'}</span>
            <span className="driver-pill-status">{driver ? statusLabels[driver.status] : 'Offline'}</span>
          </div>
        </div>
        <span
          className={classNames('tracking-indicator', trackingActive && 'active')}
          title={trackingActive ? 'Location sharing active' : 'Location paused'}
        >
          {trackingActive ? 'Live' : 'Paused'}
        </span>
      </div>
    </header>
  )
}
