import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user, updateProfile, loadOverallRating, authenticating } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [rating, setRating] = useState(null)

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
    <main className="screen settings-screen">
      <section className="card profile-card">
        <header className="card-header">
          <h1 className="card-title">Driver Profile</h1>
          <p className="card-subtitle">Update your details to keep dispatch informed.</p>
        </header>

        <form className="form" onSubmit={handleSubmit}>
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

          <section className="rating">
            <div className="rating-header">
              <span className="rating-title">Overall rating</span>
              <span className="rating-score">{formattedRating}</span>
            </div>
            <div className="rating-bar" aria-hidden="true">
              <div className="rating-bar-fill" style={{ width: `${ratingPercentage}%` }} />
            </div>
            <span className="rating-hint">Scores are out of 5.</span>
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

          <button type="submit" className="form-button" disabled={isSaving || authenticating}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>
    </main>
  )
}
