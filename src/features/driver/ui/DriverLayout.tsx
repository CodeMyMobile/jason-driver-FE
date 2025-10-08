import { Outlet } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useLocationTracking } from '../../../hooks/useLocationTracking'
import { OrdersProvider } from '../../../hooks/useOrders'
import { DriverHeader } from './components/DriverHeader'
import { DriverNav } from './components/DriverNav'

export function DriverLayout(): JSX.Element {
  const { driver } = useAuth()
  const trackingActive = useLocationTracking({ isActive: driver?.status !== 'OFFLINE' })

  return (
    <div className="driver-shell">
      <DriverHeader trackingActive={trackingActive} />
      <main className="driver-shell__main">
        <OrdersProvider>
          <Outlet context={{ trackingActive }} />
        </OrdersProvider>
      </main>
      <DriverNav />
    </div>
  )
}
