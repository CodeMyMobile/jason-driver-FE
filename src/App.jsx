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

  return (
    <div className="app-surface">
      <div className="app-panel">
        <header className="app-header">
          <Link to="/orders" className="brand" aria-label="Jason's Delivery home">
            <span className="brand-icon" aria-hidden="true" />
            <span className="brand-text">
              <span className="brand-title">Jason&apos;s Delivery</span>
              <span className="brand-subtitle">Drivers &amp; Partners</span>
            </span>
          </Link>
          {user ? (
            <div className="header-user">
              <span className="header-user-name">{user?.name?.first} {user?.name?.last}</span>
              <span className="header-user-email">{user?.email}</span>
            </div>
          ) : null}
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
