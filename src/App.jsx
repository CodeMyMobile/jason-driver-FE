import { Link, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
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

function AppLayout() {
  const { user } = useAuth()

  const navItems = [
    { to: '/orders', label: 'Orders', icon: 'orders' },
    { to: '/settings', label: 'Profile', icon: 'profile' },
  ]

  const status = user?.status?.toLowerCase() ?? ''
  const statusLabel = (() => {
    if (status === 'offline') {
      return 'Offline'
    }
    if (status === 'onduty' || status === 'on duty') {
      return 'On Duty'
    }
    if (status === 'active' || status === 'online') {
      return 'Active'
    }
    return 'Active'
  })()

  const statusTone = (() => {
    if (status === 'offline') {
      return 'offline'
    }
    if (status === 'onduty' || status === 'on duty') {
      return 'onduty'
    }
    return 'online'
  })()

  return (
    <div className="app-shell">
      <div className="app-backdrop" aria-hidden="true" />
      <div className="app-container">
        <header className="app-header">
          <Link to="/orders" className="app-logo" aria-label="Jason's Delivery home">
            <span className="app-logo-mark" aria-hidden="true">
              <span role="img" aria-label="delivery truck">
                🚚
              </span>
            </span>
            <span className="app-logo-copy">
              <span className="app-logo-title">Jason&apos;s Delivery</span>
              <span className="app-logo-subtitle">Driver Portal</span>
            </span>
          </Link>

          <nav className="app-nav-desktop" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  ['app-nav-link', isActive ? 'active' : ''].filter(Boolean).join(' ')
                }
                end={item.to === '/settings'}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="app-header-meta">
            <span className={['status-chip', statusTone].filter(Boolean).join(' ')}>
              <span className="status-dot" aria-hidden="true" />
              <span className="status-label">{statusLabel}</span>
            </span>
            {user ? (
              <div className="app-user">
                <span className="app-user-name">{user?.name?.first} {user?.name?.last}</span>
                <span className="app-user-email">{user?.email}</span>
              </div>
            ) : null}
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>

        <nav className="app-nav-mobile" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                ['app-nav-item', isActive ? 'active' : '', `icon-${item.icon}`]
                  .filter(Boolean)
                  .join(' ')
              }
              end={item.to === '/settings'}
            >
              <span className="app-nav-icon" aria-hidden="true" />
              <span className="app-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
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
