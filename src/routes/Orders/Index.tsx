import { useEffect, useMemo, useState } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { Tabs } from '../../components/Tabs'
import { OrderCard } from './OrderCard'
import { OrderDetail } from './OrderDetail'
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
  const [selected, setSelected] = useState<Order | undefined>(undefined)

  const filteredOrders = useMemo(() => {
    if (!driver) return orders
    return orders.filter((order) => order.assignedDriverId === driver.id)
  }, [driver, orders])

  useEffect(() => {
    if (!selected) return
    const next = filteredOrders.find((order) => order.id === selected.id)
    if (next && next !== selected) {
      setSelected(next)
    }
  }, [filteredOrders, selected])

  const segmented = useMemo(() => {
    const pending = filteredOrders.filter((order) => order.status === 'NEW')
    const active = filteredOrders.filter(
      (order) => order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS' || order.status === 'ARRIVED',
    )
    const completed = filteredOrders.filter((order) => order.status === 'COMPLETED')
    return { pending, active, completed }
  }, [filteredOrders])

  const listForTab = useMemo(() => {
    if (activeTab === 'pending') return segmented.pending
    if (activeTab === 'active') return segmented.active
    return segmented.completed
  }, [activeTab, segmented])

  const handleAccept = async (order: Order) => {
    await accept(order.id)
    setSelected(order)
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
    if (activeTab === 'pending') {
      if (selected) {
        setSelected(undefined)
      }
      return
    }

    if (listForTab.length === 0) {
      if (selected) {
        setSelected(undefined)
      }
      return
    }

    if (!selected) {
      setSelected(listForTab[0])
      return
    }

    const existsInTab = listForTab.some((order) => order.id === selected.id)
    if (!existsInTab) {
      setSelected(listForTab[0])
    }
  }, [activeTab, listForTab, selected])

  const selectedOrder = useMemo(() => {
    if (activeTab === 'pending') return undefined
    if (listForTab.length === 0) return undefined
    if (!selected) return listForTab[0]
    return listForTab.find((order) => order.id === selected.id) ?? listForTab[0]
  }, [activeTab, listForTab, selected])

  return (
    <div className="orders-page">
      <Tabs
        tabs={tabConfig.map((tab) => ({ ...tab, badge: tab.id === 'pending' ? segmented.pending.length : undefined }))}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />
      {activeTab === 'pending' ? (
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
      ) : (
        <div className="orders-content">
          <div className="orders-list">
            {listForTab.length === 0 ? (
              <p className="empty-state">No orders in this state.</p>
            ) : (
              listForTab.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrder?.id === order.id}
                  onSelect={setSelected}
                />
              ))
            )}
          </div>
          {selectedOrder ? (
            <OrderDetail order={selectedOrder} onArrive={handleArrive} onComplete={handleComplete} />
          ) : (
            <div className="order-placeholder">Select an order to view its details.</div>
          )}
        </div>
      )}
    </div>
  )
}
