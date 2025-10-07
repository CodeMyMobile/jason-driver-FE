import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const STATUSES = ['OFFLINE', 'ONLINE', 'ON_DELIVERY'] as const

type StatusOption = (typeof STATUSES)[number]

export default function ProfilePage() {
  const { driver, setStatus, logout } = useAuth()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!driver) {
    return null
  }

  const handleStatus = async (status: StatusOption) => {
    setUpdating(true)
    setError(null)
    try {
      await setStatus(status)
    } catch (err) {
      setError('Failed to update status. Please retry.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <section className="profile-page">
      <header className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {driver.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
        </div>
        <div>
          <h1>{driver.name}</h1>
          <p>{driver.phone}</p>
        </div>
      </header>
      <section className="profile-section">
        <h2>Driver Status</h2>
        <div className="status-grid">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={`status-chip ${driver.status === status ? 'active' : ''}`}
              onClick={() => handleStatus(status)}
              disabled={updating}
            >
              {status}
            </button>
          ))}
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </section>
      <section className="profile-section">
        <h2>Alcohol Delivery Policy</h2>
        <p className="policy-text">
          Verify customer age (21+) with government-issued ID. Confirm payment method matches order. Capture
          signature before marking delivery complete. Contact dispatch if ID or payment cannot be verified.
        </p>
      </section>
      <section className="profile-section">
        <h2>Shift Tips</h2>
        <ul className="tips-list">
          <li>Keep the app open in the foreground to stream live location updates.</li>
          <li>Install the PWA from your browser menu for faster access during shifts.</li>
          <li>Enable push notifications to be alerted of new orders and chat messages.</li>
        </ul>
      </section>
      <button type="button" className="action-btn" onClick={logout}>
        Sign Out
      </button>
    </section>
  )
}
