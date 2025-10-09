import OrderDetail from './OrderDetail.jsx'
import { classNames } from '../../utils/classNames.ts'
import { formatTimeOfDay, getInitials } from '../../utils/format.ts'

export default function CompletedOrderCard({ order, expanded, onToggle, onArrive, onComplete }) {
  const deliveredTime = formatTimeOfDay(order.createdAt)

  return (
    <article className={classNames('completed-order-card', expanded && 'expanded')}>
      <button
        type="button"
        className="completed-order-summary"
        onClick={() => onToggle(order)}
        aria-expanded={expanded}
        aria-controls={`completed-order-${order.id}`}
      >
        <div className="summary-header">
          <span className="order-number">Order #{order.number}</span>
          <div className="summary-meta">
            <span className="order-status-tag">Completed</span>
            <span className="summary-caret" aria-hidden="true">
              {expanded ? '▴' : '▾'}
            </span>
          </div>
        </div>
        <div className="summary-body">
          <div className="customer-avatar">{getInitials(order.customer.name)}</div>
          <div className="customer-details">
            <h3>{order.customer.name}</h3>
            <p>{deliveredTime ? `Delivered at ${deliveredTime}` : 'Completed order'}</p>
          </div>
        </div>
      </button>
      {expanded ? (
        <div className="completed-order-detail" id={`completed-order-${order.id}`}>
          <OrderDetail order={order} onArrive={onArrive} onComplete={onComplete} />
        </div>
      ) : null}
    </article>
  )
}
