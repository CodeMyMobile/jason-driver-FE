import { Link } from 'react-router-dom'
import { useAuth } from '../../../../hooks/useAuth'
import { DriverStatus } from '../../../../types'
import { classNames } from '../../../../utils/classNames'

const statusLabels: Record<DriverStatus, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  ON_DELIVERY: 'On Delivery',
}

export function DriverHeader({ trackingActive }: { trackingActive: boolean }): JSX.Element {
  const { driver } = useAuth()

  return (
    <header className="driver-shell__header">
      <div className="driver-shell__brand">
        <Link to="/orders" className="driver-shell__brand-link">
          Jason&apos;s Delivery
        </Link>
        <span className="driver-shell__brand-subtitle">Driver Portal</span>
      </div>
      <div className="driver-shell__status" role="status" aria-live="polite">
        <span
          className={classNames(
            'driver-shell__status-dot',
            driver?.status === 'ONLINE' && 'driver-shell__status-dot--online',
            driver?.status === 'ON_DELIVERY' && 'driver-shell__status-dot--ondelivery',
            driver?.status === 'OFFLINE' && 'driver-shell__status-dot--offline',
          )}
          aria-hidden
        />
        <div className="driver-shell__status-text">
          <span className="driver-shell__status-name">{driver?.name ?? 'Driver'}</span>
          <span className="driver-shell__status-state">
            {driver ? statusLabels[driver.status] : 'Offline'}
          </span>
        </div>
        <div
          className={classNames(
            'driver-shell__tracking-chip',
            trackingActive && 'driver-shell__tracking-chip--active',
          )}
          title={trackingActive ? 'Location sharing active' : 'Location paused'}
          aria-hidden
        >
          📡
        </div>
      </div>
    </header>
  )
}
