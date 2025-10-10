import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, token, authenticating, error, clearError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const redirectPath = useMemo(() => {
    if (location.state?.from) {
      return location.state.from
    }
    return '/settings'
  }, [location.state])

  useEffect(() => {
    if (token) {
      navigate(redirectPath, { replace: true })
    }
  }, [navigate, redirectPath, token])

  useEffect(() => {
    if (error) {
      setLocalError(error)
    }
  }, [error])

  const handleEmailChange = (event) => {
    setEmail(event.target.value)
    if (localError) {
      setLocalError('')
      clearError()
    }
  }

  const handlePasswordChange = (event) => {
    setPassword(event.target.value)
    if (localError) {
      setLocalError('')
      clearError()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email || !password) {
      setLocalError('Email and password are required.')
      return
    }

    try {
      await login(email.trim(), password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to login.'
      setLocalError(message)
    }
  }

  return (
    <main className="auth-surface">
      <section className="auth-panel" aria-labelledby="login-title">
        <header className="auth-panel-header">
          <div className="brand-icon" aria-hidden="true" />
          <p className="brand-title" id="login-title">
            Jason&apos;s Delivery
          </p>
          <p className="brand-subtitle">Drivers &amp; Partners</p>
        </header>

        <div className="auth-card">
          <h2 className="auth-card-title">Sign in to continue</h2>
          <p className="auth-card-subtitle">Access your deliveries and keep your route moving.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span className="form-label">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={handleEmailChange}
                className="form-input"
                placeholder="driver@email.com"
                disabled={authenticating}
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Enter your password"
                disabled={authenticating}
                required
              />
            </label>

            {localError ? (
              <p className="form-error" role="alert">
                {localError}
              </p>
            ) : null}

            <button type="submit" className="primary-button" disabled={authenticating}>
              {authenticating ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
