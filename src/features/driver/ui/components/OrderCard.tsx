import { Order } from '../../../../types'
import { formatCurrency, getInitials } from '../../../../utils/format'
import { TimerChip } from '../../../../components/TimerChip'
import { classNames } from '../../../../utils/classNames'

interface OrderCardProps {
  order: Order
  onAccept?: (order: Order) => void
  onSelect?: (order: Order) => void
  isSelected?: boolean
}

export function OrderCard({ order, onAccept, onSelect, isSelected }: OrderCardProps): JSX.Element {
  const isPending = order.status === 'NEW'
  const isSelectable = Boolean(onSelect)
  const mapsQuery = encodeURIComponent(order.customer.address)

  return (
    <article
      className={classNames(
        'driver-order-card',
        order.priority && 'driver-order-card--priority',
        isSelected && 'driver-order-card--selected',
        !isSelectable && 'driver-order-card--static',
      )}
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
      <header className="driver-order-card__header">
        <span className="driver-order-card__number">Order #{order.number}</span>
        <TimerChip order={order} />
      </header>
      <section className="driver-order-card__customer">
        <div className="driver-order-card__avatar">{getInitials(order.customer.name)}</div>
        <div className="driver-order-card__customer-details">
          <h3>{order.customer.name}</h3>
          <a href={`tel:${order.customer.phone}`} className="driver-order-card__phone">
            📱 {order.customer.phone}
          </a>
        </div>
      </section>
      <section className="driver-order-card__address">
        <div className="driver-order-card__address-icon" aria-hidden>
          📍
        </div>
        <div>
          <h4>Delivery Address</h4>
          <p>{order.customer.address}</p>
          <div className="driver-order-card__address-links">
            <a
              href={`https://maps.google.com/?q=${mapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Maps
            </a>
            <a href={`https://waze.com/ul?q=${mapsQuery}`} target="_blank" rel="noopener noreferrer">
              Waze
            </a>
          </div>
        </div>
      </section>
      <section className="driver-order-card__items">
        <h4>Order Items</h4>
        <ul>
          {order.items.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <span>{item.quantity}x</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="driver-order-card__total">
        <span>Order Total</span>
        <span>{formatCurrency(order.total)}</span>
      </div>
      {isPending && onAccept ? (
        <button
          type="button"
          className="driver-order-card__primary-action"
          onClick={(event) => {
            event.stopPropagation()
            onAccept(order)
          }}
        >
          Accept Order →
        </button>
      ) : null}
    </article>
  )
}
