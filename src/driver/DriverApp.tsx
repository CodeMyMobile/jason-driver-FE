import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DriverTabs } from '../components/driver/Tabs'
import { useDriverTelemetry } from './hooks/useDriverTelemetry'
import { TrackingIndicator } from './layout/TrackingIndicator'
import './driver.css'

function statusClass(status?: string): string {
  if (!status) return 'offline'
  if (status === 'ONLINE') return 'online'
  if (status === 'ON_DELIVERY') return 'on-delivery'
  return 'offline'
}

export default function DriverApp(): JSX.Element {
  const { driver } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { tracking, isActive } = useDriverTelemetry()

  const activeTab: 'assigned' | 'in-progress' | 'completed' =
    location.pathname.includes('/in-progress')
      ? 'in-progress'
      : location.pathname.includes('/completed')
        ? 'completed'
        : 'assigned'

  const handleTabSelect = (id: 'assigned' | 'in-progress' | 'completed') => {
    switch (id) {
      case 'assigned':
        navigate('/driver/orders/assigned')
        break
      case 'in-progress':
        navigate('/driver/orders/in-progress')
        break
      case 'completed':
        navigate('/driver/orders/completed')
        break
      default:
        break
    }
  }

  return (
    <div className="driver-app">
      <div className="driver-shell">
        <header className="driver-header">
          <div className="driver-status-pill">
            <span className={`driver-status-dot ${statusClass(driver?.status)}`} />
            <span>{driver?.status ?? 'OFFLINE'}</span>
          </div>
          <h1>Jason Driver</h1>
          <p>{driver ? `Welcome back, ${driver.name.split(' ')[0]}!` : 'Sign in to begin delivering.'}</p>
          <TrackingIndicator active={isActive && tracking} />
        </header>
        <main className="driver-content">
          <Outlet />
        </main>
        <footer className="driver-footer">
          <DriverTabs activeId={activeTab} onSelect={handleTabSelect} />
        </footer>
      </div>
    </div>
  )
}
