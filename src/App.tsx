import { Navigate, Route, Routes } from 'react-router-dom'
import LoginRoute from './routes/Login'
import OrdersRoute from './routes/Orders/Index'
import ProfileRoute from './routes/Profile'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { DriverLayout } from './features/driver/ui/DriverLayout'

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DriverLayout />}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="/orders" element={<OrdersRoute />} />
          <Route path="/profile" element={<ProfileRoute />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  )
}
