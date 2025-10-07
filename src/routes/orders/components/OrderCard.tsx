import { Link } from 'react-router-dom'
import type { Order } from '../../../types'
import { TimerChip } from '../../../components/TimerChip'
import { determineTimerVariant, minutesSince } from '../../../utils/time'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface OrderCardProps {
  order: Order
  onPrimaryAction?: () => void
  primaryLabel?: string
  primaryDisabled?: boolean
}

export function OrderCard({ order, onPrimaryAction, primaryLabel, primaryDisabled }: OrderCardProps) {
  const minutes = minutesSince(order.createdAt)
  const priority = determineTimerVariant(minutes) === 'priority'
  return (
    <article className={`order-card ${priority ? 'priority' : ''}`}>
      <header className="order-header">
        <span className="order-number">Order #{order.id}</span>
        <div className="order-timer">
          <TimerChip createdAt={order.createdAt} />
          <span className="timer-label">Time Since Order</span>
        </div>
      </header>
      <div className="customer-info">
        <div className="customer-avatar">{getInitials(order.customer.name)}</div>
        <div className="customer-details">
          <h3>{order.customer.name}</h3>
          {order.customer.phone ? (
            <a className="customer-phone" href={`tel:${order.customer.phone}`}>
              📱 {order.customer.phone}
            </a>
          ) : null}
        </div>
      </div>
      <div className="order-total">
        <span>Order Total</span>
        <span>${order.total.toFixed(2)}</span>
      </div>
      {primaryLabel ? (
        <button type="button" className="action-btn accept-btn" onClick={onPrimaryAction} disabled={primaryDisabled}>
          {primaryLabel}
        </button>
      ) : null}
      <Link to={`/orders/${order.id}`} className="secondary-link">
        View Details →
      </Link>
    </article>
  )
}
