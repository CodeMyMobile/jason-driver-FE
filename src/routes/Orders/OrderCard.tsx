import { Order } from '../../types'
import { formatCurrency, getInitials } from '../../utils/format'
import { TimerChip } from '../../components/TimerChip'
import { classNames } from '../../utils/classNames'
import { isPendingOrder, normalizeOrderStatus } from '../../utils/orderFilters'

interface OrderCardProps {
  order: Order
  onAccept?: (order: Order) => void
  onSelect?: (order: Order) => void
  isSelected?: boolean
}

export function OrderCard({ order, onAccept, onSelect, isSelected }: OrderCardProps): JSX.Element {
  const pending = isPendingOrder(order)
  const normalizedStatus = normalizeOrderStatus(order.status)
  const statusLabel = normalizedStatus === 'COMPLETED' ? 'Completed' : normalizedStatus === 'CANCELLED' ? 'Cancelled' : undefined

  return (
    <article
      className={classNames('order-card', order.priority && 'priority', isSelected && 'selected')}
      onClick={() => onSelect?.(order)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(order)
        }
      }}
    >
      <div className="order-header">
        <span className="order-number">Order #{order.number}</span>
        <TimerChip order={order} />
      </div>
      <div className="customer-info">
        <div className="customer-avatar">{getInitials(order.customer.name)}</div>
        <div className="customer-details">
          <h3>{order.customer.name}</h3>
          <p>📱 {order.customer.phone}</p>
        </div>
      </div>
      <div className="order-total">
        <span>Order Total</span>
        <span>{formatCurrency(order.total)}</span>
      </div>
      {pending && onAccept ? (
        <button
          type="button"
          className="action-btn accept-btn"
          onClick={(event) => {
            event.stopPropagation()
            onAccept(order)
          }}
        >
          Accept Order →
        </button>
      ) : null}
      {statusLabel ? <span className="order-status-tag">{statusLabel}</span> : null}
    </article>
  )
}
