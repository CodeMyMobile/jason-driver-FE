import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/Login.jsx'
import SettingsPage from './pages/Settings.jsx'
import OrdersFeed from './pages/orders/OrdersFeed.jsx'
import OrderDetails from './pages/orders/OrderDetails.jsx'
import OrderCamera from './pages/orders/OrderCamera.jsx'
import OrderSignature from './pages/orders/OrderSignature.jsx'
import OrderBypass from './pages/orders/OrderBypass.jsx'
import OrderCancel from './pages/orders/OrderCancel.jsx'
import PreviewOrderExperience from './pages/orders/PreviewOrderExperience.jsx'
import './App.css'

function AppLayout() {
  const navItems = [
    { to: '/orders', label: 'Orders', icon: 'orders' },
    { to: '/settings', label: 'Profile', icon: 'profile' },
  ]

  return (
    <div className="app-surface">
      <div className="app-panel">
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
  const { token, initialising } = useAuth()

  if (initialising) {
    return (
      <div className="app-surface">
        <div className="app-panel">
          <div className="app-body">
            <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" aria-label="Loading" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/preview" element={<Navigate to="/preview/assigned/preview-order" replace />} />
        <Route path="/preview/:status/:orderId" element={<PreviewOrderExperience />} />
        <Route path="*" element={<Navigate to="/preview/assigned/preview-order" replace />} />
      </Routes>
    )
  }

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
