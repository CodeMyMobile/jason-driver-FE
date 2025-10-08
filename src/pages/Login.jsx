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
    <div className="login-container">
      <div className="login-content">
        <div className="login-logo">
          <div className="logo-icon" aria-hidden>
            📦
          </div>
          <h1>Jason&apos;s Delivery</h1>
          <p>Driver Portal</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="driver@example.com"
              disabled={authenticating}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Min. 6 characters"
              disabled={authenticating}
              required
            />
          </div>

          {localError ? (
            <p className="form-error" role="alert">
              {localError}
            </p>
          ) : null}

          <button type="submit" className="login-btn" disabled={authenticating}>
            {authenticating ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="login-footer">
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Need help accessing your account?</p>
            <a className="login-support-link" href="mailto:support@jasonsdelivery.com">
              Contact Support
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
