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
  const initials = (driver?.name ?? 'Driver')
    .split(' ')
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const isOffline = driver?.status === 'OFFLINE'
  const isDriving = driver?.status === 'ONLINE' || driver?.status === 'ON_DELIVERY'

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
      <section className="profile-card profile-summary">
        <div className="profile-hero">
          <div className="profile-avatar" aria-hidden>{initials}</div>
          <div className="profile-hero-text">
            <p className="profile-overline">Driver Profile</p>
            <h2 className="profile-heading">{driver?.name ?? 'Driver'}</h2>
            <p className="profile-subheading">Jason&apos;s Delivery partner</p>
          </div>
        </div>
        <div className="profile-contact">
          <div>
            <span className="contact-label">Email</span>
            <span className="contact-value">{driver?.email ?? 'Not provided'}</span>
          </div>
          <div>
            <span className="contact-label">Phone</span>
            <span className="contact-value">{driver?.phone ?? 'Not provided'}</span>
          </div>
        </div>
      </section>
      <section className="profile-card profile-status">
        <div className="profile-card-header">
          <h3>Status</h3>
          <span className={`tracking-chip ${trackingActive ? 'live' : 'paused'}`}>
            {trackingActive ? 'Live location on' : 'Location paused'}
          </span>
        </div>
        <div className="status-toggle">
          <button
            type="button"
            className={`status-button ${isOffline ? 'active' : ''}`}
            disabled={updating}
            onClick={() => handleStatusChange('OFFLINE')}
          >
            Offline
          </button>
          <button
            type="button"
            className={`status-button ${isDriving ? 'active' : ''}`}
            disabled={updating}
            onClick={() => handleStatusChange('ONLINE')}
          >
            Drive
          </button>
        </div>
        <p className="status-helper">Switch to Drive when you&apos;re ready to accept new orders.</p>
      </section>
      <section className="profile-card profile-session">
        <h3>Session</h3>
        <p className="session-note">Signed in as {driver?.email ?? 'your account'}</p>
        <button type="button" className="action-btn danger" onClick={logout}>
          Sign Out
        </button>
      </section>
    </div>
  )
}
