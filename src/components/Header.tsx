import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface HeaderProps {
  onToggleShift?: () => void
  streaming: boolean
}

export function Header({ onToggleShift, streaming }: HeaderProps) {
  const { driver } = useAuth()

  return (
    <header className="app-header">
      <Link to="/orders" className="brand" aria-label="Jason's Delivery home">
        Jason&apos;s Delivery
      </Link>
      <div className="driver-chip">
        <span className={`status-indicator ${streaming ? 'online' : 'offline'}`} aria-hidden="true" />
        <div className="driver-meta">
          <span className="driver-name">{driver?.name ?? 'Driver'}</span>
          <span className="driver-status">{driver?.status ?? 'OFFLINE'}</span>
        </div>
        <button type="button" className="location-toggle" onClick={onToggleShift} aria-label="Toggle location sharing">
          📡
        </button>
      </div>
    </header>
  )
}
