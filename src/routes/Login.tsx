import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { LoginScreen } from '../features/driver/ui/LoginScreen'

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

  function fillDemo() {
    setEmail('driver@example.com')
    setPassword('password123')
  }

  return (
    <LoginScreen
      email={email}
      password={password}
      loading={loading}
      onSubmit={handleSubmit}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onFillDemo={fillDemo}
    />
  )
}
