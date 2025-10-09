import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import LoginRoute from './routes/Login.jsx'
import OrdersRoute from './routes/Orders/Index.jsx'
import ProfileRoute from './routes/Profile.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Header from './components/Header.jsx'
import BottomNav from './components/BottomNav.jsx'
import { useAuth } from './hooks/useAuth.jsx'
import { useLocationTracking } from './hooks/useLocationTracking.ts'
import { OrdersProvider } from './hooks/useOrders.jsx'

function AppShell() {
  const { driver } = useAuth()
  const trackingActive = useLocationTracking({ isActive: driver?.status !== 'OFFLINE' })

  return (
    <div className="driver-shell">
      <Header trackingActive={trackingActive} />
      <main className="driver-shell__main">
        <OrdersProvider>
          <Outlet context={{ trackingActive }} />
        </OrdersProvider>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
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
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  )
}
