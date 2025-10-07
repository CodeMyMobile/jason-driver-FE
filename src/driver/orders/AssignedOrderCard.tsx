import { useMemo, useState } from 'react'
import { DriverOrder } from '../types'
import { LocationLinks } from './LocationLinks'

interface AssignedOrderCardProps {
  order: DriverOrder
  onAccept: (orderId: string) => Promise<void>
}

function formatRelativeTime(createdAt: string): string {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000))
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  if (minutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''} ago`
  }
  return `${hours}h ${minutes}m ago`
}

export function AssignedOrderCard({ order, onAccept }: AssignedOrderCardProps): JSX.Element {
  const [submitting, setSubmitting] = useState(false)
  const timingLabel = useMemo(() => formatRelativeTime(order.createdAt), [order.createdAt])
  const handleAccept = async () => {
    setSubmitting(true)
    try {
      await onAccept(order.id)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="assigned-card" aria-label={`Order ${order.number}`}>
      <header className="assigned-card-header">
        <div>
          <p className="assigned-card-number">{order.number}</p>
          <p className="assigned-card-customer">{order.customer.name}</p>
        </div>
        <div className="assigned-card-meta">
          <span className="assigned-card-timing">{timingLabel}</span>
          <span className="assigned-card-total">${order.total.toFixed(2)}</span>
        </div>
      </header>
      <section className="assigned-card-body">
        <p className="assigned-card-address">{order.customer.address}</p>
        <LocationLinks address={order.customer.address} />
        {order.notes ? <p className="assigned-card-notes">Note: {order.notes}</p> : null}
        <ul className="assigned-card-items">
          {order.items.slice(0, 3).map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <span className="assigned-card-quantity">×{item.quantity}</span>
            </li>
          ))}
          {order.items.length > 3 ? <li className="assigned-card-more">+{order.items.length - 3} more</li> : null}
        </ul>
      </section>
      <footer className="assigned-card-footer">
        <button
          type="button"
          className="driver-button-primary"
          onClick={handleAccept}
          disabled={submitting}
        >
          {submitting ? 'Accepting…' : 'Accept Delivery'}
        </button>
      </footer>
    </article>
  )
}
