import { formatCurrency, getInitials } from '../../utils/format.ts'
import TimerChip from '../../components/TimerChip.jsx'
import { classNames } from '../../utils/classNames.ts'

export default function OrderCard({ order, onAccept, onSelect, isSelected }) {
  const isPending = order.status === 'assigned'
  const statusLabel = order.status === 'completed' ? 'Completed' : undefined
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
      <div className="order-total">
        <span>Order Total</span>
        <span>{formatCurrency(order.total)}</span>
      </div>
      {order.items.length > 0 ? (
        <ul className="order-items">
          {order.items.map((item) => (
            <li key={item.id} className="order-item">
              <span className="item-quantity">{item.quantity}x</span>
              <span className="item-name">{item.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {isPending && onAccept ? (
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
