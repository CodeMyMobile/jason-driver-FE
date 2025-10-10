import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user, updateProfile, loadOverallRating, authenticating, logout } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [rating, setRating] = useState(null)
  const [status, setStatus] = useState('offline')
  const navigate = useNavigate()

  const driverId = useMemo(() => user?._id || user?.id, [user])

  useEffect(() => {
    if (user) {
      setFirstName(user.name?.first || '')
      setLastName(user.name?.last || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
    }
  }, [user])

  useEffect(() => {
    let ignore = false

    async function loadRating() {
      if (!driverId) {
        return
      }

      try {
        const ratingResponse = await loadOverallRating(driverId)

        if (ignore) {
          return
        }

        if (Array.isArray(ratingResponse)) {
          const numeric = Number(ratingResponse[0]?.average ?? ratingResponse[0]?.rating)
          if (!Number.isNaN(numeric)) {
            setRating(numeric)
          }
        } else if (ratingResponse && typeof ratingResponse === 'object') {
          const value = Number(ratingResponse.average ?? ratingResponse.rating)
          if (!Number.isNaN(value)) {
            setRating(value)
          }
        } else if (typeof ratingResponse === 'number') {
          setRating(ratingResponse)
        }
      } catch (err) {
        console.warn('Unable to load rating', err)
      }
    }

    loadRating()

    return () => {
      ignore = true
    }
  }, [driverId, loadOverallRating])

  const formattedRating = useMemo(() => {
    if (typeof rating !== 'number') {
      return 'N/A'
    }

    return rating.toFixed(2)
  }, [rating])

  const ratingPercentage = useMemo(() => {
    if (typeof rating !== 'number') {
      return 0
    }

    const clamped = Math.max(0, Math.min(5, rating))
    return (clamped / 5) * 100
  }, [rating])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!driverId) {
      setError('Missing driver information.')
      return
    }

    setIsSaving(true)
    setFeedback('')
    setError('')

    try {
      await updateProfile(driverId, {
        name: {
          first: firstName,
          last: lastName,
        },
        email,
        phone,
      })
      setFeedback('Profile updated successfully.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update profile.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="profile-surface">
      <section className="profile-card" aria-labelledby="profile-title">
        <header className="profile-header">
          <h1 className="profile-title" id="profile-title">
            Driver Profile
          </h1>
          <p className="profile-subtitle">Keep your dispatcher in the loop and stay delivery ready.</p>
        </header>

        <div className="profile-overview">
          <div>
            <p className="profile-name">{[firstName, lastName].filter(Boolean).join(' ') || 'Driver name'}</p>
            <p className="profile-contact">{email || 'Add your email'}</p>
            <p className="profile-contact">{phone || 'Add your phone number'}</p>
          </div>
          <div className="profile-rating" role="group" aria-label="Overall rating">
            <span className="rating-value">{formattedRating}</span>
            <span className="rating-label">Overall rating</span>
          </div>
        </div>

        <section className="status-section" aria-label="Availability status">
          <div className="section-heading">
            <h2>Status</h2>
            <p>Select your availability for dispatch.</p>
          </div>
          <div className="status-toggle" role="radiogroup" aria-label="Driver status">
            <button
              type="button"
              className={['toggle-button', status === 'offline' ? 'active' : ''].filter(Boolean).join(' ')}
              onClick={() => setStatus('offline')}
              aria-pressed={status === 'offline'}
            >
              Offline
            </button>
            <button
              type="button"
              className={['toggle-button', status === 'drive' ? 'active' : ''].filter(Boolean).join(' ')}
              onClick={() => setStatus('drive')}
              aria-pressed={status === 'drive'}
            >
              Drive
            </button>
          </div>
        </section>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <h2>Driver details</h2>
            <p>Double-check your information before heading out.</p>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">First name</span>
              <input
                type="text"
                name="firstName"
                className="form-input"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                disabled={isSaving || authenticating}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Last name</span>
              <input
                type="text"
                name="lastName"
                className="form-input"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                disabled={isSaving || authenticating}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Email</span>
              <input
                type="email"
                name="email"
                className="form-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={isSaving || authenticating}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Phone</span>
              <input
                type="tel"
                name="phone"
                className="form-input"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                disabled={isSaving || authenticating}
              />
            </label>
          </div>

          <section className="rating-card">
            <div className="rating-track" aria-hidden="true">
              <div className="rating-track-fill" style={{ width: `${ratingPercentage}%` }} />
            </div>
            <p className="rating-hint">Scores are calculated out of 5.</p>
          </section>

          {feedback ? (
            <p className="form-success" role="status">
              {feedback}
            </p>
          ) : null}

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="primary-button" disabled={isSaving || authenticating}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <section className="session-card" aria-label="Session controls">
          <div className="section-heading">
            <h2>Session</h2>
            <p>Wrap up when you&apos;re done for the day.</p>
          </div>
          <button
            type="button"
            className="danger-button"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Sign out
          </button>
        </section>
      </section>
    </main>
  )
}
