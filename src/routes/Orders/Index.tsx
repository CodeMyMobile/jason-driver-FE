import { useEffect, useMemo, useState } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { Tabs } from '../../components/Tabs'
import { OrderCard } from './OrderCard'
import { OrderDetail } from './OrderDetail'
import { CompletedOrderCard } from './CompletedOrderCard'
import { Order } from '../../types'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'

const tabConfig = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'accepted', label: 'Accepted (In Progress)' },
  { id: 'completed', label: 'Completed' },
]

type TabId = (typeof tabConfig)[number]['id']

function isCompleted(order: Order): boolean {
  return Boolean(order.completedAt) || order.status === 'COMPLETED'
}

function isActive(order: Order): boolean {
  if (isCompleted(order)) return false
  if (order.status === 'ARRIVED' || order.status === 'IN_PROGRESS') return true
  if (order.startedAt) return true
  if (order.acceptedAt) return true
  if (order.status === 'ASSIGNED' && (order.acceptedAt || order.startedAt)) return true
  return false
}

export default function OrdersRoute(): JSX.Element {
  const { orders, accept, markStarted, markArrived, markComplete } = useOrders()
  const { push } = useToast()
  const { driver } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('assigned')
  const [expandedCompletedId, setExpandedCompletedId] = useState<string | undefined>(undefined)
  const [completedVisibleCount, setCompletedVisibleCount] = useState(10)

  const segmented = useMemo(() => {
    const assigned: Order[] = []
    const accepted: Order[] = []
    const completed: Order[] = []
    const driverId = driver?.id

    orders.forEach((order) => {
      if (!driverId || order.assignedDriverId !== driverId) {
        return
      }

      if (isCompleted(order)) {
        completed.push(order)
        return
      }

      if (isActive(order)) {
        accepted.push(order)
        return
      }

      assigned.push(order)
    })

    completed.sort((a, b) => {
      const aDate = a.completedAt ?? a.createdAt
      const bDate = b.completedAt ?? b.createdAt
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })

    accepted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    assigned.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    return { assigned, accepted, completed }
  }, [driver?.id, orders])

  const listForTab = useMemo(() => {
    if (activeTab === 'assigned') return segmented.assigned
    if (activeTab === 'accepted') return segmented.accepted
    return segmented.completed
  }, [activeTab, segmented])

  const visibleCompletedOrders = useMemo(
    () => segmented.completed.slice(0, completedVisibleCount),
    [completedVisibleCount, segmented.completed],
  )

  const canShowMoreCompleted = segmented.completed.length > completedVisibleCount

  const handleAccept = async (order: Order) => {
    await accept(order.id)
    setActiveTab('accepted')
  }

  const handleStart = async (orderId: string) => {
    await markStarted(orderId)
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
    <div className="orders-page">
      <Tabs
        tabs={tabConfig.map((tab) => ({
          ...tab,
          badge: tab.id === 'assigned' ? segmented.assigned.length : undefined,
        }))}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />
      {activeTab === 'assigned' ? (
        <div className="pending-orders">
          <div className="orders-list pending-list">
            {listForTab.length === 0 ? (
              <p className="empty-state">No orders in this state.</p>
            ) : (
              listForTab.map((order) => (
                <OrderCard key={order.id} order={order} onAccept={handleAccept} />
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'accepted' ? (
        <div className="active-orders">
          {listForTab.length === 0 ? (
            <p className="empty-state">No orders in this state.</p>
          ) : (
            listForTab.map((order) => (
              <OrderDetail
                key={order.id}
                order={order}
                onStart={handleStart}
                onArrive={handleArrive}
                onComplete={handleComplete}
              />
            ))
          )}
        </div>
      ) : (
        <div className="completed-orders">
          {segmented.completed.length === 0 ? (
            <p className="empty-state">No orders in this state.</p>
          ) : (
            <>
              <div className="completed-orders-list">
                {visibleCompletedOrders.map((order) => (
                  <CompletedOrderCard
                    key={order.id}
                    order={order}
                    expanded={expandedCompletedId === order.id}
                    onToggle={(next) =>
                      setExpandedCompletedId((current) => (current === next.id ? undefined : next.id))
                    }
                  />
                ))}
              </div>
              {canShowMoreCompleted ? (
                <button
                  type="button"
                  className="see-more-button"
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
        </div>
      )}
    </div>
  )
}
