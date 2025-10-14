import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchOrders } from '../../services/orderService'
import './Orders.css'

const SECTION_CONFIG = [
  {
    key: 'assigned',
    status: 'Assigned',
    tabLabel: 'Pending',
    title: 'Assigned Orders',
    description: 'Orders that are ready for you to accept.',
    statuses: ['Assigned', 'Pending'],
  },
  {
    key: 'accepted',
    status: 'Accepted',
    tabLabel: 'Active',
    title: 'Accepted Orders',
    description: 'Orders that are waiting to start delivery.',
    statuses: ['Accepted'],
  },
  {
    key: 'progress',
    status: 'In Progress',
    tabLabel: 'Completed',
    title: 'Out for Delivery',
    description: 'Orders that are currently on the way.',
    statuses: ['In Progress', 'Out for delivery', 'Completed', 'Delivered'],
  },
]

const SECTION_STATUS_MAP = SECTION_CONFIG.reduce((acc, section) => {
  const statuses = section.statuses?.length ? section.statuses : [section.status]
  acc[section.key] = statuses
  return acc
}, {})

const STATUS_TO_SECTION = Object.entries(SECTION_STATUS_MAP).reduce((acc, [key, statuses]) => {
  statuses.forEach((status) => {
    acc[status.toLowerCase()] = key
  })

  return acc
}, {})

function formatName(owner) {
  if (!owner) {
    return 'Unknown customer'
  }

  return [owner?.name?.first, owner?.name?.last].filter(Boolean).join(' ') || 'Unknown customer'
}

function formatInitials(owner) {
  if (!owner) {
    return 'JD'
  }

  const first = owner?.name?.first?.[0]
  const last = owner?.name?.last?.[0]

  const initials = [first, last].filter(Boolean).join('')
  if (initials) {
    return initials.toUpperCase()
  }

  const fallback = owner?.name?.first || owner?.name?.last || owner?.email || 'JD'
  return fallback.slice(0, 2).toUpperCase()
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

const ORDER_IDENTIFIER_KEYS = ['orderNumber', 'displayId', 'reference', 'code', 'orderId', 'id']

function formatOrderCode(order) {
  for (const key of ORDER_IDENTIFIER_KEYS) {
    const value = order?.[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  if (typeof order?._id === 'string' && order._id.trim()) {
    const trimmed = order._id.trim()
    const suffix = trimmed.slice(-6).toUpperCase()
    return suffix ? `#${suffix}` : trimmed
  }

  return 'New Order'
}

function resolveStatusVariant(status) {
  if (!status) {
    return 'pending'
  }

  const normalized = status.toLowerCase()

  if (['assigned', 'pending', 'new'].includes(normalized)) {
    return 'pending'
  }

  if (['accepted', 'in progress', 'out for delivery', 'active'].includes(normalized)) {
    return 'active'
  }

  if (['completed', 'delivered', 'finished'].includes(normalized)) {
    return 'completed'
  }

  return 'active'
}

function resolveStatusKey(status) {
  if (!status) {
    return SECTION_CONFIG[0].key
  }

  return STATUS_TO_SECTION[status.toLowerCase()] ?? SECTION_CONFIG[0].key
}

export default function OrdersFeed() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [view, setView] = useState(SECTION_CONFIG[0].key)

  const loadOrders = useCallback(async () => {
    if (!token) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchOrders(token)
      setOrders(Array.isArray(data) ? data : [])
      setLastUpdated(new Date())
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

  const viewConfig = useMemo(
    () => SECTION_CONFIG.find((entry) => entry.key === view) ?? SECTION_CONFIG[0],
    [view],
  )

  const sectionCounts = useMemo(() => {
    const counts = SECTION_CONFIG.reduce((acc, section) => {
      acc[section.key] = 0
      return acc
    }, {})

    orders.forEach((order) => {
      const key = resolveStatusKey(order.status)
      counts[key] = (counts[key] ?? 0) + 1
    })

    return counts
  }, [orders])

  const displayedOrders = useMemo(() => {
    const statuses = SECTION_STATUS_MAP[viewConfig.key] ?? []
    const statusSet = new Set(statuses.map((status) => status.toLowerCase()))

    return orders.filter((order) => {
      if (!order.status) {
        return false
      }

      return statusSet.has(order.status.toLowerCase())
    })
  }, [orders, viewConfig])

  const totalOrders = useMemo(() => orders.length, [orders])

  const busiestSection = useMemo(() => {
    return SECTION_CONFIG.reduce(
      (acc, section) => {
        const count = sectionCounts[section.key] ?? 0

        if (!acc || count > acc.count) {
          return { ...section, count }
        }

        return acc
      },
      null,
    )
  }, [sectionCounts])

  const calmestSection = useMemo(() => {
    const sorted = SECTION_CONFIG.map((section) => ({
      ...section,
      count: sectionCounts[section.key] ?? 0,
    })).sort((a, b) => a.count - b.count)

    return sorted[0]
  }, [sectionCounts])

  if (loading && orders.length === 0) {
    return (
      <div className="orders-loading">
        <div className="spinner" aria-label="Loading orders" />
      </div>
    )
  }

  return (
    <div className="orders-page">
      <header className="orders-hero" aria-labelledby="orders-title">
        <div className="orders-hero-copy">
          <p className="orders-kicker">Driver dashboard</p>
          <h1 className="orders-hero-title" id="orders-title">
            Orders overview
          </h1>
          <p className="orders-hero-subtitle">
            Monitor incoming assignments, stay ahead of active routes, and close out completed drops.
          </p>
        </div>

        <div className="orders-hero-metrics" role="group" aria-label="Orders summary">
          <div className="orders-metric primary">
            <span className="orders-metric-label">Total orders</span>
            <span className="orders-metric-value">{totalOrders}</span>
            {lastUpdated ? (
              <span className="orders-metric-meta">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </div>
          {busiestSection ? (
            <div className="orders-metric">
              <span className="orders-metric-label">Busiest lane</span>
              <span className="orders-metric-value">{busiestSection.count}</span>
              <span className="orders-metric-meta">{busiestSection.tabLabel ?? busiestSection.status}</span>
            </div>
          ) : null}
          {calmestSection ? (
            <div className="orders-metric subtle">
              <span className="orders-metric-label">Quietest lane</span>
              <span className="orders-metric-value">{calmestSection.count}</span>
              <span className="orders-metric-meta">{calmestSection.tabLabel ?? calmestSection.status}</span>
            </div>
          ) : null}
        </div>
      </header>

      <div className="orders-toolbar">
        <div className="orders-tabs" role="tablist" aria-label="Order status">
          {SECTION_CONFIG.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={view === option.key}
              className={['orders-tab', view === option.key ? 'active' : '', `accent-${option.key}`]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setView(option.key)}
            >
              <span className="orders-tab-label">{option.tabLabel ?? option.status}</span>
              <span className="orders-tab-count">{sectionCounts[option.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="orders-toolbar-actions">
          <button
            type="button"
            className="icon-button"
            onClick={loadOrders}
            disabled={loading}
            aria-label="Refresh orders"
          >
            <span aria-hidden="true" className="refresh-icon" />
          </button>
          <span className="orders-toolbar-hint">Tap to refresh assignments</span>
        </div>
      </div>

      {error ? (
        <div className="form-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="orders-layout">
        <section className="orders-main" aria-live="polite">
          <div className="orders-list" role="list">
            {displayedOrders.length === 0 ? (
              <div className="orders-empty" role="status">
                <p>No {(viewConfig.tabLabel ?? viewConfig.status).toLowerCase()} orders yet.</p>
                <p className="orders-empty-hint">Keep an eye out for dispatcher updates.</p>
              </div>
            ) : (
              displayedOrders.map((order) => {
                const sectionKey = resolveStatusKey(order.status)
                const variant = resolveStatusVariant(order.status)

                return (
                  <Link
                    key={order._id}
                    className={['order-card', `variant-${variant}`].join(' ')}
                    to={`/orders/${sectionKey}/${order._id}`}
                    state={{ order }}
                  >
                    <div className="order-card-header">
                      <div className="order-card-heading">
                        <span className="order-card-label">Order</span>
                        <span className="order-card-number">{formatOrderCode(order)}</span>
                      </div>
                      <span className="order-status-pill">{order.status ?? 'Unknown'}</span>
                    </div>
                    <div className="order-card-body">
                      <span className="order-avatar" aria-hidden="true">
                        {formatInitials(order.owner)}
                      </span>
                      <div className="order-card-customer">
                        <p className="order-card-title">{formatName(order.owner)}</p>
                        <p className="order-card-meta">{formatAddress(order.address)}</p>
                      </div>
                      <span className="order-card-chevron" aria-hidden="true" />
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </section>

        <aside className="orders-summary-panel" aria-label="Order distribution">
          <div className="orders-summary-card">
            <h2>Today at a glance</h2>
            <ul>
              {SECTION_CONFIG.map((section) => (
                <li key={section.key}>
                  <span className="summary-dot" data-variant={section.key} aria-hidden="true" />
                  <div>
                    <p className="summary-label">{section.tabLabel ?? section.status}</p>
                    <p className="summary-meta">{section.description}</p>
                  </div>
                  <span className="summary-count">{sectionCounts[section.key] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="orders-summary-card subtle">
            <h3>Need a breather?</h3>
            <p>Switch to the Profile tab to update your status or log a break.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
