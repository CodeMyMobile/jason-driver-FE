import { useEffect, useMemo, useState } from 'react'
import { useOrders } from '../../hooks/useOrders.jsx'
import Tabs from '../../components/Tabs.jsx'
import OrderCard from './OrderCard.jsx'
import OrderDetail from './OrderDetail.jsx'
import CompletedOrderCard from './CompletedOrderCard.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { useAuth } from '../../hooks/useAuth.jsx'

const tabConfig = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'out-for-delivery', label: 'Out for delivery' },
]

export default function OrdersRoute() {
  const { orders, accept, markArrived, markComplete } = useOrders()
  const { push } = useToast()
  const { driver } = useAuth()
  const [activeTab, setActiveTab] = useState('assigned')
  const [expandedCompletedId, setExpandedCompletedId] = useState()
  const [completedVisibleCount, setCompletedVisibleCount] = useState(10)

  const segmented = useMemo(() => {
    const assigned = orders.filter((order) => order.status === 'NEW' || order.status === 'ASSIGNED')
    const accepted = orders.filter((order) => {
      if (order.status !== 'IN_PROGRESS') {
        return false
      }

      if (!driver) return true

      return order.assignedDriverId === driver.id
    })
    const outForDelivery = orders.filter((order) => {
      if (order.status !== 'ARRIVED') {
        return false
      }

      if (!driver) return true

      return order.assignedDriverId === driver.id
    })
    const completed = orders
      .filter((order) => {
        if (order.status !== 'COMPLETED') return false
        if (!driver) return true
        return order.assignedDriverId === driver.id
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return { assigned, accepted, outForDelivery, completed }
  }, [driver, orders])

  const visibleCompletedOrders = useMemo(
    () => segmented.completed.slice(0, completedVisibleCount),
    [completedVisibleCount, segmented.completed],
  )

  const canShowMoreCompleted = segmented.completed.length > completedVisibleCount

  const handleAccept = async (order) => {
    await accept(order.id)
    setActiveTab('accepted')
  }

  const handleArrive = async (orderId) => {
    await markArrived(orderId)
    setActiveTab('out-for-delivery')
  }

  const handleComplete = async (orderId, signature) => {
    await markComplete(orderId, signature)
    push({ title: 'Signature captured', description: 'Delivery is complete.', variant: 'success' })
  }

  useEffect(() => {
    if (activeTab !== 'out-for-delivery') {
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

  const assignedOrders = segmented.assigned
  const acceptedOrders = segmented.accepted
  const outForDeliveryOrders = segmented.outForDelivery
  const driverFirstName = driver?.name ? driver.name.split(' ')[0] : undefined
  const heroLabel = driverFirstName ? `${driverFirstName}'s Delivery` : 'Delivery overview'

  return (
    <div className="orders-page">
      <header className="orders-hero">
        <span className="orders-hero__badge">{heroLabel}</span>
        <div className="orders-hero__heading">
          <h1>Orders</h1>
          <p>Keep track of every stop on your route today.</p>
        </div>
      </header>
      <Tabs
        tabs={tabConfig.map((tab) => ({
          ...tab,
          badge:
            tab.id === 'assigned'
              ? assignedOrders.length
              : tab.id === 'accepted'
              ? acceptedOrders.length
              : undefined,
        }))}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id)}
      />
      {activeTab === 'assigned' ? (
        <div className="orders-section">
          {assignedOrders.length === 0 ? (
            <p className="empty-state">No orders waiting on you.</p>
          ) : (
            <div className="orders-list">
              {assignedOrders.map((order) => (
                <OrderCard key={order.id} order={order} onAccept={handleAccept} />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'accepted' ? (
        <div className="orders-section">
          {acceptedOrders.length === 0 ? (
            <p className="empty-state">No accepted orders right now.</p>
          ) : (
            <div className="orders-detail-stack">
              {acceptedOrders.map((order) => (
                <OrderDetail
                  key={order.id}
                  order={order}
                  onArrive={handleArrive}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="orders-section">
          {outForDeliveryOrders.length === 0 ? (
            <p className="empty-state">No stops are currently in transit.</p>
          ) : (
            <div className="orders-detail-stack">
              {outForDeliveryOrders.map((order) => (
                <OrderDetail
                  key={order.id}
                  order={order}
                  onArrive={handleArrive}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}
          <div className="orders-history">
            <h2>Recent deliveries</h2>
            {segmented.completed.length === 0 ? (
              <p className="orders-history__empty">No completed deliveries yet today.</p>
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
                      onArrive={handleArrive}
                      onComplete={handleComplete}
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
        </div>
      )}
    </div>
  )
}
