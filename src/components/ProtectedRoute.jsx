import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function ProtectedRoute() {
  const { driver, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        Loading driver session…
      </div>
    )
  }

  if (!driver) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
