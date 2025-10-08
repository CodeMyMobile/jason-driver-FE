import { Order } from '../../../../types'
import { classNames } from '../../../../utils/classNames'
import { formatTimeOfDay, getInitials } from '../../../../utils/format'
import { ActiveOrderDetail } from './ActiveOrderDetail'

interface CompletedOrderCardProps {
  order: Order
  expanded: boolean
  onToggle: (order: Order) => void
  onArrive: (orderId: string) => Promise<void>
  onComplete: (orderId: string, signature: string) => Promise<void>
}

export function CompletedOrderCard({
  order,
  expanded,
  onToggle,
  onArrive,
  onComplete,
}: CompletedOrderCardProps): JSX.Element {
  const deliveredTime = formatTimeOfDay(order.createdAt)

  return (
    <article className={classNames('driver-completed-card', expanded && 'driver-completed-card--expanded')}>
      <button
        type="button"
        className="driver-completed-card__summary"
        onClick={() => onToggle(order)}
        aria-expanded={expanded}
        aria-controls={`completed-order-${order.id}`}
      >
        <div className="driver-completed-card__header">
          <span className="driver-completed-card__number">Order #{order.number}</span>
          <div className="driver-completed-card__meta">
            <span className="driver-completed-card__tag">Completed</span>
            <span className="driver-completed-card__caret" aria-hidden>{expanded ? '▴' : '▾'}</span>
          </div>
        </div>
        <div className="driver-completed-card__body">
          <div className="driver-completed-card__avatar">{getInitials(order.customer.name)}</div>
          <div className="driver-completed-card__details">
            <h3>{order.customer.name}</h3>
            <p>{deliveredTime ? `Delivered at ${deliveredTime}` : 'Completed order'}</p>
          </div>
        </div>
      </button>
      {expanded ? (
        <div className="driver-completed-card__detail" id={`completed-order-${order.id}`}>
          <ActiveOrderDetail order={order} onArrive={onArrive} onComplete={onComplete} />
        </div>
      ) : null}
    </article>
  )
}
