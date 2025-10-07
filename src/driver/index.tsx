import { Navigate, Route, Routes } from 'react-router-dom'
import DriverLogin from './Login'
import DriverApp from './DriverApp'
import AssignedOrders from './orders/Assigned'
import AcceptedInProgress from './orders/AcceptedInProgress'
import { DriverProtectedRoute } from './DriverProtectedRoute'
import CompletedOrders from './orders/Completed'

export default function DriverRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="login" element={<DriverLogin />} />
      <Route element={<DriverProtectedRoute />}>
        <Route element={<DriverApp />}>
          <Route index element={<Navigate to="orders/assigned" replace />} />
          <Route path="orders/assigned" element={<AssignedOrders />} />
          <Route path="orders/in-progress" element={<AcceptedInProgress />} />
          <Route path="orders/completed" element={<CompletedOrders />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  )
}
