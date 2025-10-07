import { FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate, type Location } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const demoCredentials = {
  email: 'driver@example.com',
  password: 'password123',
}

export default function LoginPage() {
  const { driver, login, loggingIn, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  if (driver) {
    return <Navigate to="/orders" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!email.includes('@') || password.length < 6) {
      setFormError('Enter a valid email and password (min. 6 characters).')
      return
    }
    try {
      await login(email, password)
      const redirectPath = (location.state as { from?: Location })?.from?.pathname ?? '/orders'
      navigate(redirectPath, { replace: true })
    } catch (err) {
      console.error(err)
    }
  }

  const handleDemo = () => {
    setEmail(demoCredentials.email)
    setPassword(demoCredentials.password)
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-logo">
          <div className="logo-icon" aria-hidden="true">
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="driver@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Min. 6 characters"
              autoComplete="current-password"
              required
              minLength={6}
            />
          </div>
          {formError ? <p className="form-error">{formError}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="login-btn" disabled={loggingIn}>
            {loggingIn ? 'Signing In…' : 'Sign In'}
          </button>
          <div className="login-footer">
            <p className="demo-hint">Demo: Use any email + 6+ char password</p>
            <button type="button" onClick={handleDemo} className="demo-button">
              Use Demo Credentials
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
