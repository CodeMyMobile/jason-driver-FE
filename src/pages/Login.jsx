import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/login.css'

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
    <main className="login-page">
      <section className="login-page__panel" aria-labelledby="login-heading">
        <header className="login-page__header">
          <div className="login-page__badge" aria-hidden="true">
            <span role="img" aria-label="package">📦</span>
          </div>
          <h1 id="login-heading" className="login-page__title">
            Jason's Delivery
          </h1>
          <p className="login-page__subtitle">Driver Portal</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-form__field">
            <span className="login-form__label">Email Address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={handleEmailChange}
              className="login-form__input"
              placeholder="driver@example.com"
              disabled={authenticating}
              required
            />
          </label>

          <label className="login-form__field">
            <span className="login-form__label">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={handlePasswordChange}
              className="login-form__input"
              placeholder="Min. 6 characters"
              disabled={authenticating}
              required
            />
          </label>

          {localError ? (
            <p className="login-form__error" role="alert">
              {localError}
            </p>
          ) : null}

          <button type="submit" className="login-form__submit" disabled={authenticating}>
            {authenticating ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <footer className="login-page__footer">
          <p className="login-page__help-text">Need help accessing your account?</p>
          <a className="login-page__support-link" href="mailto:support@jasonsdelivery.com">
            Contact Support
          </a>
        </footer>
      </section>
    </main>
  )
}
