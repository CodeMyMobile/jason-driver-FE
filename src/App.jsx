import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
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

  const firstName = user?.name?.first ?? ''
  const lastName = user?.name?.last ?? ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const now = new Date()
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(now)

  return (
    <div className="app-surface">
      <div className="app-panel">
        <header className="app-header">
          <div className="app-header-top">
            <span className="app-header-emblem" aria-hidden="true" />
            <div className="app-header-copy">
              <span className="app-header-label">Driver dashboard</span>
              <h1 className="app-header-title">
                {firstName ? `Welcome back, ${firstName}!` : 'Welcome back!'}
              </h1>
            </div>
          </div>

          <div className="app-header-bottom">
            <div className="app-header-date" aria-label="Current date and time">
              <span className="app-header-date-label">{formattedDate}</span>
              <span className="app-header-time">{formattedTime}</span>
            </div>
            {fullName || user?.email ? (
              <div className="app-header-user" aria-label="Signed in user">
                {fullName ? <span className="app-header-name">{fullName}</span> : null}
                {user?.email ? <span className="app-header-email">{user.email}</span> : null}
              </div>
            ) : null}
          </div>
        </header>

        <div className="app-body">
          <Outlet />
        </div>

        <nav className="tab-bar" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                ['tab-bar-item', isActive ? 'active' : '', `icon-${item.icon}`]
                  .filter(Boolean)
                  .join(' ')
              }
              end={item.to === '/settings'}
            >
              <span className="tab-icon" aria-hidden="true" />
              <span className="tab-label">{item.label}</span>
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
