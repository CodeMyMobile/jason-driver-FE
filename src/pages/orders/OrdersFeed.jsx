import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchOrders } from '../../services/orderService'
import './Orders.css'

const TAB_CONFIG = [
  {
    key: 'pending',
    label: 'Pending',
    statuses: ['Assigned'],
  },
  {
    key: 'active',
    label: 'Active',
    statuses: ['Accepted', 'In Progress', 'Out for delivery'],
  },
  {
    key: 'completed',
    label: 'Completed',
    statuses: ['Completed', 'Delivered'],
  },
]

const STATUS_TO_TAB = TAB_CONFIG.reduce((acc, tab) => {
  tab.statuses.forEach((status) => {
    acc[status.toLowerCase()] = tab.key
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

function resolveTabKey(status) {
  if (!status) {
    return TAB_CONFIG[0].key
  }

  return STATUS_TO_TAB[status.toLowerCase()] ?? TAB_CONFIG[0].key
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
  const [view, setView] = useState(TAB_CONFIG[0].key)

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

  const countsByTab = useMemo(() => {
    return orders.reduce((acc, order) => {
      const tabKey = resolveTabKey(order.status)
      acc[tabKey] = (acc[tabKey] ?? 0) + 1
      return acc
    }, {})
  }, [orders])

  const ordersByTab = useMemo(() => {
    return orders.reduce((acc, order) => {
      const tabKey = resolveTabKey(order.status)
      if (!acc[tabKey]) {
        acc[tabKey] = []
      }

      acc[tabKey].push(order)
      return acc
    }, {})
  }, [orders])

  const viewConfig = useMemo(
    () => TAB_CONFIG.find((tab) => tab.key === view) ?? TAB_CONFIG[0],
    [view],
  )

  const activeOrders = ordersByTab[viewConfig.key] ?? []

  if (loading && orders.length === 0) {
    return (
      <div className="orders-loading">
        <div className="spinner" aria-label="Loading orders" />
      </div>
    )
  }

  return (
    <div className="orders-surface">
      <section className="orders-panel" aria-label="Orders">
        <header className="orders-panel-header">
          <div className="orders-tabs" role="tablist" aria-label="Order status">
            {TAB_CONFIG.map((tab) => {
              const tabCount = countsByTab[tab.key] ?? 0
              const tabId = `${tab.key}-tab`
              const panelId = `${tab.key}-panel`

              return (
                <button
                  key={tab.key}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-selected={view === tab.key}
                  aria-controls={panelId}
                  className={['orders-tab', view === tab.key ? 'active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setView(tab.key)}
                >
                  <span className="orders-tab-label">{tab.label}</span>
                  <span className="orders-tab-count">{tabCount}</span>
                </button>
              )
            })}
          </div>
        </header>

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        <div
          id={`${viewConfig.key}-panel`}
          role="tabpanel"
          aria-labelledby={`${viewConfig.key}-tab`}
          className="orders-panel-body"
        >
          {activeOrders.length === 0 ? (
            <div className="orders-empty" role="status">
              <p>No {viewConfig.label.toLowerCase()} orders yet.</p>
            </div>
          ) : (
            <div className="orders-list" role="list">
              {activeOrders.map((order) => {
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
                      <span className={`order-status-tag ${viewConfig.key}`}>
                        {order.status ?? viewConfig.label}
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
                        <span>
                          {itemsCount} item{itemsCount === 1 ? '' : 's'}
                        </span>
                        {formattedTotal ? <span>{formattedTotal}</span> : null}
                      </div>
                    </div>

                    <span className="order-card-cta">Review order</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
