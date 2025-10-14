import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchOrders } from '../../services/orderService'
import './Orders.css'

const COLUMN_CONFIG = [
  {
    key: 'pending',
    title: 'Pending',
    description: 'Orders that are waiting for you to accept them.',
    statuses: ['Assigned'],
  },
  {
    key: 'active',
    title: 'Active',
    description: 'Orders that are currently out for delivery.',
    statuses: ['Accepted', 'In Progress', 'Out for delivery'],
  },
  {
    key: 'completed',
    title: 'Completed',
    description: 'Orders that you have already delivered.',
    statuses: ['Completed', 'Delivered'],
  },
]

const STATUS_TO_COLUMN = COLUMN_CONFIG.reduce((acc, column) => {
  column.statuses.forEach((status) => {
    acc[status.toLowerCase()] = column.key
  })

  return acc
}, {})

function formatName(owner) {
  if (!owner) {
    return 'Unknown customer'
  }

  return [owner?.name?.first, owner?.name?.last].filter(Boolean).join(' ') || 'Unknown customer'
}

function formatAddress(address) {
  if (!address) {
    return 'No address on file'
  }

  const parts = []

  if (address.apartment) {
    parts.push(`Apt ${address.apartment}`)
  }

  if (address.description) {
    parts.push(address.description)
  }

  return parts.join(', ') || 'No address on file'
}

function resolveColumnKey(status) {
  if (!status) {
    return COLUMN_CONFIG[0].key
  }

  return STATUS_TO_COLUMN[status.toLowerCase()] ?? COLUMN_CONFIG[0].key
}

function resolveRouteKey(status) {
  if (!status) {
    return 'assigned'
  }

  const normalized = status.toLowerCase()

  if (normalized === 'assigned') {
    return 'assigned'
  }

  if (normalized === 'accepted') {
    return 'accepted'
  }

  if (normalized === 'in progress' || normalized === 'out for delivery') {
    return 'progress'
  }

  if (normalized === 'completed' || normalized === 'delivered') {
    return 'completed'
  }

  return 'assigned'
}

function formatOrderCode(order) {
  const reference = order?.orderCode || order?.orderId || order?.number || order?.reference

  if (reference) {
    return `#${String(reference).toUpperCase()}`
  }

  if (order?._id) {
    const suffix = String(order._id).slice(-6)
    return `#${suffix.toUpperCase()}`
  }

  return '#Order'
}

function resolveInitials(name) {
  if (!name) {
    return '??'
  }

  const parts = name.split(' ').filter(Boolean)

  if (parts.length === 0) {
    return name.slice(0, 2).toUpperCase()
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function countOrderItems(order) {
  if (!order?.qty || !Array.isArray(order.qty)) {
    return 0
  }

  return order.qty.reduce((sum, value) => sum + (Number(value) || 0), 0)
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return null
  }

  const amount = Number(value)

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function OrdersFeed() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const loadOrders = useCallback(async () => {
    if (!token) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchOrders(token)
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load orders.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const countsByColumn = useMemo(() => {
    return orders.reduce((acc, order) => {
      const columnKey = resolveColumnKey(order.status)
      acc[columnKey] = (acc[columnKey] ?? 0) + 1
      return acc
    }, {})
  }, [orders])

  const ordersByColumn = useMemo(() => {
    return orders.reduce((acc, order) => {
      const columnKey = resolveColumnKey(order.status)
      if (!acc[columnKey]) {
        acc[columnKey] = []
      }

      acc[columnKey].push(order)
      return acc
    }, {})
  }, [orders])

  if (loading && orders.length === 0) {
    return (
      <div className="orders-loading">
        <div className="spinner" aria-label="Loading orders" />
      </div>
    )
  }

  return (
    <div className="orders-surface">
      <section className="orders-board" aria-labelledby="orders-title">
        <header className="orders-header">
          <div>
            <h1 className="orders-title" id="orders-title">
              Orders
            </h1>
            <p className="orders-subtitle">Stay close to the action and refresh as you go.</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={loadOrders}
            disabled={loading}
            aria-label="Refresh orders"
          >
            <span aria-hidden="true" className="refresh-icon" />
          </button>
        </header>

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="orders-columns">
          {COLUMN_CONFIG.map((column) => {
            const columnOrders = ordersByColumn[column.key] ?? []
            const columnCount = countsByColumn[column.key] ?? 0

            return (
              <section key={column.key} className="orders-column" aria-labelledby={`${column.key}-title`}>
                <header className="orders-column-header">
                  <div className="orders-column-copy">
                    <h2 className="orders-column-title" id={`${column.key}-title`}>
                      {column.title}
                    </h2>
                    <p className="orders-column-subtitle">{column.description}</p>
                  </div>
                  <span className="orders-column-count" aria-label={`${column.title} count`}>
                    {columnCount}
                  </span>
                </header>

                <div className="orders-column-body" role="list">
                  {columnOrders.length === 0 ? (
                    <div className="orders-column-empty" role="status">
                      <p>No {column.title.toLowerCase()} orders yet.</p>
                    </div>
                  ) : (
                    columnOrders.map((order) => {
                      const customerName = formatName(order.owner)
                      const initials = resolveInitials(customerName)
                      const itemsCount = countOrderItems(order)
                      const formattedTotal = formatCurrency(order.total)
                      const routeKey = resolveRouteKey(order.status)

                      return (
                        <Link
                          key={order._id}
                          className="order-card"
                          to={`/orders/${routeKey}/${order._id}`}
                          state={{ order }}
                          role="listitem"
                        >
                          <div className="order-card-header">
                            <div className="order-card-title-group">
                              <span className="order-card-label">Order</span>
                              <span className="order-card-code">{formatOrderCode(order)}</span>
                            </div>
                            <span className={`order-status-tag ${column.key}`}>
                              {order.status ?? column.title}
                            </span>
                          </div>

                          <div className="order-card-body">
                            <div className="order-card-customer">
                              <span className="order-card-avatar" aria-hidden="true">
                                {initials}
                              </span>
                              <div>
                                <p className="order-card-name">{customerName}</p>
                                {order.owner?.phone ? (
                                  <p className="order-card-meta">{order.owner.phone}</p>
                                ) : null}
                              </div>
                            </div>

                            <div className="order-card-address">
                              <p>{formatAddress(order.address)}</p>
                            </div>

                            <div className="order-card-stats">
                              <span>{itemsCount} item{itemsCount === 1 ? '' : 's'}</span>
                              {formattedTotal ? <span>{formattedTotal}</span> : null}
                            </div>
                          </div>

                          <span className="order-card-cta">Review order</span>
                        </Link>
                      )
                    })
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </section>
    </div>
  )
}
