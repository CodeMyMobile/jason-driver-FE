import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ redirectTo = '/login' }) {
  const { token, initialising } = useAuth()

  if (initialising) {
    return (
      <div className="screen-center">
        <div className="spinner" aria-label="Loading" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
