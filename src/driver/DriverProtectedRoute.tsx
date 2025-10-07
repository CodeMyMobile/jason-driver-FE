import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function DriverProtectedRoute(): JSX.Element {
  const { driver, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="driver-loading" role="status" aria-live="polite">
        Loading driver workspace…
      </div>
    )
  }

  if (!driver) {
    return <Navigate to="/driver/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
