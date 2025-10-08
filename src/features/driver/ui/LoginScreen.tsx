import { FormEvent } from 'react'

interface LoginScreenProps {
  email: string
  password: string
  loading: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onFillDemo: () => void
}

export function LoginScreen({
  email,
  password,
  loading,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onFillDemo,
}: LoginScreenProps): JSX.Element {
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
        <form className="login-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="driver@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Min. 6 characters"
              minLength={6}
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
          <div className="login-footer">
            <p className="demo-note">Demo: Use any email + 6+ char password</p>
            <button type="button" className="demo-button" onClick={onFillDemo}>
              Use Demo Credentials
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
