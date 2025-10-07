import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import LoginRoute from './routes/Login'
import OrdersRoute from './routes/Orders/Index'
import ProfileRoute from './routes/Profile'
import { ProtectedRoute } from './components/ProtectedRoute'
import DriverRoutes from './driver'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { useAuth } from './hooks/useAuth'
import { useLocationTracking } from './hooks/useLocationTracking'
import { OrdersProvider } from './hooks/useOrders'

function AppShell(): JSX.Element {
  const { driver } = useAuth()
  const trackingActive = useLocationTracking({ isActive: driver?.status !== 'OFFLINE' })

  return (
    <div className="app-container">
      <Header trackingActive={trackingActive} />
      <main className="app-main">
        <OrdersProvider>
          <Outlet context={{ trackingActive }} />
        </OrdersProvider>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="/orders" element={<OrdersRoute />} />
          <Route path="/profile" element={<ProfileRoute />} />
        </Route>
      </Route>
      <Route path="/driver/*" element={<DriverRoutes />} />
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  )
}
