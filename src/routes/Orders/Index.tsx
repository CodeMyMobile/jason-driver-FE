import { useEffect, useMemo, useState } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { OrdersTabs } from '../../features/driver/ui/components/OrdersTabs'
import { OrderCard } from './OrderCard'
import { OrderDetail } from './OrderDetail'
import { CompletedOrderCard } from './CompletedOrderCard'
import { Order } from '../../types'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'

const tabConfig = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

type TabId = (typeof tabConfig)[number]['id']

export default function OrdersRoute(): JSX.Element {
  const { orders, accept, markArrived, markComplete } = useOrders()
  const { push } = useToast()
  const { driver } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('pending')
  const [expandedCompletedId, setExpandedCompletedId] = useState<string | undefined>(undefined)
  const [completedVisibleCount, setCompletedVisibleCount] = useState(10)

  const segmented = useMemo(() => {
    const isAssignedToDriver = (order: Order) => {
      if (!driver) return true
      if (order.assignedDriverId == null || String(order.assignedDriverId).trim() === '') {
        return true
      }
      return String(order.assignedDriverId) === String(driver.id)
    }

    const pending = orders.filter((order) => order.status === 'NEW')
    const active = orders.filter((order) => {
      if (order.status !== 'IN_PROGRESS' && order.status !== 'ARRIVED') {
        return false
      }

      return isAssignedToDriver(order)
    })
    const completed = orders
      .filter((order) => {
        if (order.status !== 'COMPLETED') return false
        return isAssignedToDriver(order)
      })
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    return { pending, active, completed }
  }, [driver, orders])

  const listForTab = useMemo(() => {
    if (activeTab === 'pending') return segmented.pending
    if (activeTab === 'active') return segmented.active
    return segmented.completed
  }, [activeTab, segmented])

  const visibleCompletedOrders = useMemo(
    () => segmented.completed.slice(0, completedVisibleCount),
    [completedVisibleCount, segmented.completed],
  )

  const canShowMoreCompleted = segmented.completed.length > completedVisibleCount

  const handleAccept = async (order: Order) => {
    await accept(order.id)
    setActiveTab('active')
  }

  const handleArrive = async (orderId: string) => {
    await markArrived(orderId)
  }

  const handleComplete = async (orderId: string, signature: string) => {
    await markComplete(orderId, signature)
    push({ title: 'Signature captured', description: 'Delivery is complete.', variant: 'success' })
  }

  useEffect(() => {
    if (activeTab !== 'completed') {
      setExpandedCompletedId(undefined)
    }
  }, [activeTab])

  useEffect(() => {
    if (!expandedCompletedId) return

    const stillExists = segmented.completed.some((order) => order.id === expandedCompletedId)
    if (!stillExists) {
      setExpandedCompletedId(undefined)
    }
  }, [expandedCompletedId, segmented.completed])

  useEffect(() => {
    setCompletedVisibleCount(10)
  }, [segmented.completed.length])

  return (
    <div className="driver-orders">
      <OrdersTabs
        tabs={tabConfig.map((tab) => ({ ...tab, badge: tab.id === 'pending' ? segmented.pending.length : undefined }))}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />
      <div className="driver-orders__content">
        {activeTab === 'pending' ? (
          <section className="driver-orders__section" aria-label="Pending orders">
            {listForTab.length === 0 ? (
              <p className="driver-orders__empty">No orders in this state.</p>
            ) : (
              listForTab.map((order) => (
                <OrderCard key={order.id} order={order} onAccept={handleAccept} />
              ))
            )}
          </section>
        ) : activeTab === 'active' ? (
          <section className="driver-orders__section" aria-label="Active orders">
            {listForTab.length === 0 ? (
              <p className="driver-orders__empty">No orders in this state.</p>
            ) : (
              listForTab.map((order) => (
                <OrderDetail key={order.id} order={order} onArrive={handleArrive} onComplete={handleComplete} />
              ))
            )}
          </section>
        ) : (
          <section className="driver-orders__section" aria-label="Completed orders">
            {segmented.completed.length === 0 ? (
              <p className="driver-orders__empty">No orders in this state.</p>
            ) : (
              <>
                <div className="driver-orders__completed-list">
                  {visibleCompletedOrders.map((order) => (
                    <CompletedOrderCard
                      key={order.id}
                      order={order}
                      expanded={expandedCompletedId === order.id}
                      onToggle={(next) =>
                        setExpandedCompletedId((current) =>
                          current === next.id ? undefined : next.id,
                        )
                      }
                      onArrive={handleArrive}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
                {canShowMoreCompleted ? (
                  <button
                    type="button"
                    className="driver-orders__see-more"
                    onClick={() =>
                      setCompletedVisibleCount((current) =>
                        Math.min(current + 10, segmented.completed.length),
                      )
                    }
                  >
                    See more
                  </button>
                ) : null}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
