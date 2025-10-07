import type { Order } from '../../../types'
import { OrderCard } from './OrderCard'

interface OrderListProps {
  orders: Order[] | undefined
  loading: boolean
  emptyLabel: string
  onAccept?: (orderId: string) => void
  acceptingId?: string | null
}

export function OrderList({ orders, loading, emptyLabel, onAccept, acceptingId }: OrderListProps) {
  if (loading) {
    return (
      <div className="list-placeholder" role="status" aria-live="polite">
        Loading orders…
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return <p className="list-placeholder">{emptyLabel}</p>
  }

  return (
    <div>
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onPrimaryAction={onAccept ? () => onAccept(order.id) : undefined}
          primaryLabel={onAccept ? 'Accept Order →' : undefined}
          primaryDisabled={acceptingId === order.id}
        />
      ))}
    </div>
  )
}
