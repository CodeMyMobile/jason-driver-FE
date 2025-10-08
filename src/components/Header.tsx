import { Link } from 'react-router-dom'
import { DriverStatus } from '../types'
import { useAuth } from '../hooks/useAuth'
import { classNames } from '../utils/classNames'

interface HeaderProps {
  trackingActive: boolean
}

const statusLabels: Record<DriverStatus, string> = {
  ONLINE: 'Active',
  OFFLINE: 'Offline',
  ON_DELIVERY: 'On Delivery',
}

export function Header({ trackingActive }: HeaderProps): JSX.Element {
  const { driver } = useAuth()
  const statusLabel = driver ? statusLabels[driver.status] : 'Offline'

  return (
    <header className="app-header">
      <div className="app-title-group">
        <h1 className="app-title">
          <Link to="/orders" className="app-title-link">
            Jason&apos;s Delivery
          </Link>
        </h1>
      </div>
      <div className="driver-pill" aria-live="polite">
        <span
          className={classNames(
            'status-dot',
            driver?.status === 'ONLINE' && 'online',
            driver?.status === 'ON_DELIVERY' && 'onduty',
            driver?.status === 'OFFLINE' && 'offline',
          )}
          aria-hidden
        >
          <span
            className={classNames('tracking-indicator', trackingActive && 'active')}
            title={trackingActive ? 'Location sharing active' : 'Location paused'}
          />
        </span>
        <div className="driver-pill-text">
          <span className="driver-pill-status">{statusLabel}</span>
          <span className="driver-pill-name">{driver?.name ?? 'Driver'}</span>
        </div>
      </div>
    </header>
  )
}
