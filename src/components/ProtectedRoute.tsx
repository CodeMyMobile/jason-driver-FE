import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { driver, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <span className="spinner" />
        <p>Loading driver session…</p>
      </div>
    )
  }

  if (!driver) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
