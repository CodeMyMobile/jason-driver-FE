import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './driver.css'

interface LocationState {
  from?: { pathname?: string }
}

export default function DriverLogin(): JSX.Element {
  const { login, loading, driver } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (driver) {
      const state = location.state as LocationState | undefined
      const destination = state?.from?.pathname ?? '/driver/orders/assigned'
      navigate(destination, { replace: true })
    }
  }, [driver, location.state, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to sign in. Please check your credentials and try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="driver-app">
      <div className="driver-shell login-shell">
        <header className="driver-header">
          <div className="driver-status-pill">
            <span className="driver-status-dot offline" />
            <span>Offline</span>
          </div>
          <h1>Jason Driver</h1>
          <p>Sign in to access your delivery assignments.</p>
        </header>
        <main className="driver-content login-content">
          <form className="driver-login-form" onSubmit={handleSubmit}>
            <label className="driver-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="driver@example.com"
              />
            </label>
            <label className="driver-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="••••••••"
              />
            </label>
            {error ? (
              <p className="assigned-error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="driver-button-primary" disabled={submitting || loading}>
              {submitting || loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="login-hint">Use your Jason Logistics driver credentials to continue.</p>
        </main>
      </div>
    </div>
  )
}
