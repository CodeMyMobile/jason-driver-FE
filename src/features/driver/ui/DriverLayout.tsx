import { Outlet } from 'react-router-dom'
import { useLocationTracking } from '../../../hooks/useLocationTracking'
import { OrdersProvider } from '../../../hooks/useOrders'
import { DriverHeader } from './components/DriverHeader'
import { DriverNav } from './components/DriverNav'

export function DriverLayout(): JSX.Element {
  const trackingActive = useLocationTracking({ isActive: true })

  return (
    <div className="driver-shell">
      <DriverHeader trackingActive={trackingActive} />
      <main className="driver-shell__main">
        <OrdersProvider>
          <Outlet />
        </OrdersProvider>
      </main>
      <DriverNav />
    </div>
  )
}
