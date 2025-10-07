import { useCallback } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/Login.jsx'
import SettingsPage from './pages/Settings.jsx'
import './App.css'

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const isSettingsRoute = location.pathname.startsWith('/settings')

  return (
    <div className="app-shell">
      <header className="app-bar">
        <Link to="/settings" className="brand" aria-label="Jason's Liquor driver portal">
          Jason&apos;s Liquor Drivers
        </Link>
        <div className="app-bar-actions">
          {isSettingsRoute ? (
            <div className="user-meta">
              <span className="user-name">{user?.name?.first} {user?.name?.last}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          ) : null}
          <button type="button" className="link-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/settings" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  )
}
