import { useEffect, useMemo, useState } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { Tabs } from '../../components/Tabs'
import { OrderCard } from './OrderCard'
import { OrderDetail } from './OrderDetail'
import { Order } from '../../types'
import { useToast } from '../../hooks/useToast'

const tabConfig = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

type TabId = (typeof tabConfig)[number]['id']

export default function OrdersRoute(): JSX.Element {
  const { orders, accept, markArrived, markComplete } = useOrders()
  const { push } = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('pending')
  const [selected, setSelected] = useState<Order | undefined>(undefined)

  useEffect(() => {
    if (!selected) return
    const next = orders.find((order) => order.id === selected.id)
    if (next && next !== selected) {
      setSelected(next)
    }
  }, [orders, selected])

  const segmented = useMemo(() => {
    const pending = orders.filter((order) => order.status === 'NEW' || order.status === 'ASSIGNED')
    const active = orders.filter((order) => order.status === 'IN_PROGRESS' || order.status === 'ARRIVED')
    const completed = orders.filter((order) => order.status === 'COMPLETED')
    return { pending, active, completed }
  }, [orders])

  const listForTab =
    activeTab === 'pending' ? segmented.pending : activeTab === 'active' ? segmented.active : segmented.completed

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

  const selectedOrder = selected ?? segmented.active[0] ?? segmented.pending[0] ?? segmented.completed[0]

  return (
    <div className="orders-page">
      <Tabs
        tabs={tabConfig.map((tab) => ({ ...tab, badge: tab.id === 'pending' ? segmented.pending.length : undefined }))}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />
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
                onAccept={activeTab === 'pending' ? handleAccept : undefined}
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
    </div>
  )
}
