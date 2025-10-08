import { Order } from '../../types'
import { formatCurrency, getInitials } from '../../utils/format'
import { TimerChip } from '../../components/TimerChip'
import { classNames } from '../../utils/classNames'

interface OrderCardProps {
  order: Order
  onAccept?: (order: Order) => void
  onSelect?: (order: Order) => void
  isSelected?: boolean
}

export function OrderCard({ order, onAccept, onSelect, isSelected }: OrderCardProps): JSX.Element {
  const isPending = order.status === 'NEW'
  const statusLabel = order.status === 'COMPLETED' ? 'Completed' : undefined
  const isSelectable = Boolean(onSelect)

  return (
    <article
      className={classNames('order-card', order.priority && 'priority', isSelected && 'selected', !isSelectable && 'static')}
      onClick={() => onSelect?.(order)}
      role={isSelectable ? 'button' : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onKeyDown={(event) => {
        if (!isSelectable) return
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
      <div className="address-section compact">
        <div className="address-icon">📍</div>
        <div className="address-text">
          <h4>Delivery Address</h4>
          <p>{order.customer.address}</p>
          <div className="address-links">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(order.customer.address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Maps
            </a>
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(order.customer.address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Waze
            </a>
          </div>
        </div>
      </div>
      {order.items.length > 0 ? (
        <div className="items-section compact">
          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.id} className="order-item">
                <span className="item-quantity">{item.quantity}x</span>
                <span className="item-name">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="order-total">
        <span>Order Total</span>
        <span>{formatCurrency(order.total)}</span>
      </div>
      {isPending && onAccept ? (
        <button
          type="button"
          className="action-btn accept-btn"
          onClick={(event) => {
            event.stopPropagation()
            onAccept(order)
          }}
        >
          ACCEPT ORDER →
        </button>
      ) : null}
      {statusLabel ? <span className="order-status-tag">{statusLabel}</span> : null}
    </article>
  )
}
