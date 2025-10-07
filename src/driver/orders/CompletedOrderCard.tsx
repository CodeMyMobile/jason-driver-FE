import { useMemo } from 'react'
import { DriverOrder } from '../types'
import { LocationLinks } from './LocationLinks'

interface CompletedOrderCardProps {
  order: DriverOrder
}

function formatCompletedLabel(completedAt?: string | null): string {
  if (!completedAt) return 'Completion time unavailable'
  const date = new Date(completedAt)
  if (Number.isNaN(date.getTime())) return 'Completion time unavailable'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CompletedOrderCard({ order }: CompletedOrderCardProps): JSX.Element {
  const completionLabel = useMemo(() => formatCompletedLabel(order.completedAt), [order.completedAt])

  return (
    <article className="completed-card" aria-label={`Completed order ${order.number}`}>
      <header className="completed-card-header">
        <div>
          <p className="assigned-card-number">{order.number}</p>
          <p className="assigned-card-customer">{order.customer.name}</p>
        </div>
        <div className="completed-card-meta">
          <span className="assigned-card-total">${order.total.toFixed(2)}</span>
          <span className="completed-card-time">{completionLabel}</span>
        </div>
      </header>
      <section className="completed-card-body">
        <p className="assigned-card-address">{order.customer.address}</p>
        <LocationLinks address={order.customer.address} />
        {order.notes ? <p className="assigned-card-notes">Note: {order.notes}</p> : null}
        <ul className="assigned-card-items">
          {order.items.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <span className="assigned-card-quantity">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
