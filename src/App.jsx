import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/Login.jsx'
import SettingsPage from './pages/Settings.jsx'
import OrdersFeed from './pages/orders/OrdersFeed.jsx'
import OrderDetails from './pages/orders/OrderDetails.jsx'
import OrderCamera from './pages/orders/OrderCamera.jsx'
import OrderSignature from './pages/orders/OrderSignature.jsx'
import OrderBypass from './pages/orders/OrderBypass.jsx'
import OrderCancel from './pages/orders/OrderCancel.jsx'
import './App.css'

function getStatusClass(status) {
  if (!status) {
    return 'online'
  }

  const normalized = status.toLowerCase()
  if (normalized.includes('progress') || normalized.includes('delivery')) {
    return 'on-delivery'
  }
  if (normalized.includes('offline')) {
    return 'offline'
  }
  return 'online'
}

function getStatusLabel(status) {
  if (!status) {
    return 'Active'
  }
  const normalized = status.toLowerCase()
  if (normalized.includes('progress') || normalized.includes('delivery')) {
    return 'On Delivery'
  }
  if (normalized.includes('offline')) {
    return 'Offline'
  }
  if (normalized.includes('accepted')) {
    return 'Accepted'
  }
  return 'Online'
}

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const fullName = [user?.name?.first, user?.name?.last].filter(Boolean).join(' ') || 'Driver'
  const statusLabel = getStatusLabel(user?.status)
  const statusClass = getStatusClass(user?.status)

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <Link to="/orders">Jason&apos;s Delivery</Link>
        </h1>
        <div className="driver-pill">
          <span className={`status-dot ${statusClass}`} aria-hidden />
          <div className="driver-pill-text">
            <span className="driver-pill-name">{fullName}</span>
            <span className="driver-pill-status">{statusLabel}</span>
          </div>
          <button type="button" className="logout-button" onClick={handleLogout} title="Sign out">
            ⎋
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Primary">
        <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <span role="img" aria-hidden>
            📦
          </span>
          <span>Orders</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span role="img" aria-hidden>
            👤
          </span>
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrdersFeed />} />
            <Route path="/orders/:status/:orderId" element={<OrderDetails />} />
            <Route path="/orders/:status/:orderId/camera" element={<OrderCamera />} />
            <Route path="/orders/:status/:orderId/signature" element={<OrderSignature />} />
            <Route path="/orders/:status/:orderId/bypass" element={<OrderBypass />} />
            <Route path="/orders/:status/:orderId/cancel" element={<OrderCancel />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  )
}
