import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { DriverStatus } from '../types'

interface AppShellContext {
  trackingActive: boolean
}

export default function ProfileRoute(): JSX.Element {
  const { trackingActive } = useOutletContext<AppShellContext>()
  const { driver, logout, setStatus } = useAuth()
  const { push } = useToast()
  const [updating, setUpdating] = useState(false)

  async function handleStatusChange(nextStatus: DriverStatus) {
    if (!driver || driver.status === nextStatus) return
    setUpdating(true)
    try {
      await setStatus(nextStatus)
      push({ title: 'Status updated', description: `Now ${nextStatus.toLowerCase().replace('_', ' ')}`, variant: 'success' })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="profile-page">
      <section className="profile-card">
        <h2>Driver Profile</h2>
        <p className="profile-name">{driver?.name}</p>
        <p className="profile-email">{driver?.email}</p>
        <p className="profile-phone">{driver?.phone}</p>
      </section>
      <section className="profile-card">
        <h3>Status</h3>
        <div className="status-buttons">
          <button
            type="button"
            className={`status-button ${driver?.status === 'OFFLINE' ? 'active' : ''}`}
            disabled={updating}
            onClick={() => handleStatusChange('OFFLINE')}
          >
            Offline
          </button>
          <button
            type="button"
            className={`status-button ${driver?.status === 'ONLINE' ? 'active' : ''}`}
            disabled={updating}
            onClick={() => handleStatusChange('ONLINE')}
          >
            Online
          </button>
          <button
            type="button"
            className={`status-button ${driver?.status === 'ON_DELIVERY' ? 'active' : ''}`}
            disabled={updating}
            onClick={() => handleStatusChange('ON_DELIVERY')}
          >
            On Delivery
          </button>
        </div>
        <p className="tracking-note">Location tracking: {trackingActive ? 'Active' : 'Paused'}</p>
      </section>
      <section className="profile-card">
        <h3>Session</h3>
        <button type="button" className="action-btn danger" onClick={logout}>
          Sign Out
        </button>
      </section>
    </div>
  )
}
