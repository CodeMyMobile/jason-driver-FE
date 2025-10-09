import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function LoginRoute(): JSX.Element {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      push({ title: 'Signed in', description: 'Welcome back!', variant: 'success' })
      navigate('/orders', { replace: true })
    } catch (error) {
      push({ title: 'Unable to sign in', description: 'Check your email and password.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="driver-login">
      <div className="driver-login__panel">
        <div className="driver-login__brand">
          <div className="driver-login__logo" aria-hidden>
            📦
          </div>
          <h1>Jason&apos;s Delivery</h1>
          <p>Driver Portal</p>
        </div>
        <form className="driver-login__form" onSubmit={handleSubmit}>
          <div className="driver-login__field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="driver@example.com"
              required
            />
          </div>
          <div className="driver-login__field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Min. 6 characters"
              minLength={6}
              required
            />
          </div>
          <button type="submit" className="driver-login__submit" disabled={loading}>
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
          <div className="driver-login__helper">
            <span>Need help signing in?</span>
            <span>Contact your dispatcher for assistance.</span>
          </div>
        </form>
      </div>
    </div>
  )
}
