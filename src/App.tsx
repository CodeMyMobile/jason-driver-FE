import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import LoginRoute from './routes/Login'
import OrdersRoute from './routes/Orders/Index'
import ProfileRoute from './routes/Profile'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { useAuth } from './hooks/useAuth'
import { useLocationTracking } from './hooks/useLocationTracking'
import { OrdersProvider } from './hooks/useOrders'
import { DriverLayout } from './features/driver/ui/DriverLayout'

function AppShell(): JSX.Element {
  const { driver } = useAuth()
  const trackingActive = useLocationTracking({ isActive: driver?.status !== 'OFFLINE' })

  return (
    <DriverLayout trackingActive={trackingActive}>
      <OrdersProvider>
        <Outlet context={{ trackingActive }} />
      </OrdersProvider>
    </DriverLayout>
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
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  )
}
