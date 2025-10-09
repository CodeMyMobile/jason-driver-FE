import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchOrders } from '../../services/orderService'
import './Orders.css'

const SECTION_CONFIG = [
  {
    key: 'assigned',
    status: 'Assigned',
    title: 'Assigned Orders',
    description: 'Orders that are ready for you to accept.',
  },
  {
    key: 'accepted',
    status: 'Accepted',
    title: 'Accepted Orders',
    description: 'Orders that are waiting to start delivery.',
  },
  {
    key: 'progress',
    status: 'In Progress',
    title: 'Out for Delivery',
    description: 'Orders that are currently on the way.',
  },
]

const SECTION_STATUS_MAP = SECTION_CONFIG.reduce((acc, section) => {
  if (section.key === 'progress') {
    acc[section.key] = [section.status, 'Out for delivery']
  } else {
    acc[section.key] = [section.status]
  }

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
    <div className="orders-surface">
      <section className="orders-card" aria-labelledby="orders-title">
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

        <div className="orders-tabs" role="tablist" aria-label="Order status">
          {SECTION_CONFIG.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={view === option.key}
              className={['orders-tab', view === option.key ? 'active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setView(option.key)}
            >
              {option.status}
            </button>
          ))}
        </div>

        <section className="orders-summary" aria-live="polite">
          <div className="summary-hero">
            <span className="summary-pill">{viewConfig.status}</span>
            <h2 className="summary-title">{viewConfig.title}</h2>
            <p className="summary-description">{viewConfig.description}</p>
            <div className="summary-hero-metric">
              <span className="summary-count">{displayedOrders.length}</span>
              <span className="summary-label">Active Orders</span>
            </div>
            {lastUpdated ? (
              <p className="summary-meta">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : (
              <p className="summary-meta">Waiting for first refresh</p>
            )}
          </div>

          <div className="summary-overview">
            <div className="summary-distribution">
              <div className="summary-section-header">
                <h3>Queue overview</h3>
                <span>{totalOrders} total</span>
              </div>
              {totalOrders > 0 ? (
                <>
                  <div className="summary-distribution-bar" role="presentation">
                    {SECTION_CONFIG.map((section) => {
                      const count = sectionCounts[section.key] ?? 0

                      return (
                        <span
                          key={section.key}
                          className={`summary-distribution-segment ${section.key}`}
                          style={{ flexGrow: Math.max(count, 1) }}
                          title={`${section.status}: ${count} orders`}
                        />
                      )
                    })}
                  </div>
                  <ul className="summary-distribution-legend">
                    {SECTION_CONFIG.map((section) => {
                      const count = sectionCounts[section.key] ?? 0
                      const percentage = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0

                      return (
                        <li key={section.key}>
                          <span className={`legend-dot ${section.key}`} aria-hidden="true" />
                          <div className="legend-copy">
                            <span className="legend-label">{section.status}</span>
                            <span className="legend-value">
                              {count} <span className="legend-percentage">({percentage}%)</span>
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : (
                <p className="summary-empty">No orders in queue yet.</p>
              )}
            </div>

            <div className="summary-insights-grid">
              <article className="summary-insight-card">
                <h4>Busiest queue</h4>
                {busiestSection ? (
                  <>
                    <p className="insight-primary">{busiestSection.status}</p>
                    <p className="insight-secondary">{busiestSection.count} orders waiting</p>
                  </>
                ) : (
                  <p className="insight-secondary">Waiting for new activity</p>
                )}
              </article>
              <article className="summary-insight-card">
                <h4>Calmest queue</h4>
                {calmestSection ? (
                  <>
                    <p className="insight-primary">{calmestSection.status}</p>
                    <p className="insight-secondary">{calmestSection.count} orders</p>
                  </>
                ) : (
                  <p className="insight-secondary">Waiting for new activity</p>
                )}
              </article>
              <article className="summary-insight-card">
                <h4>Currently viewing</h4>
                <p className="insight-primary">{viewConfig.title}</p>
                <p className="insight-secondary">{viewConfig.description}</p>
              </article>
            </div>
          </div>
        </section>

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="orders-list" role="list">
          {displayedOrders.length === 0 ? (
            <div className="orders-empty" role="status">
              <p>No {viewConfig.status.toLowerCase()} orders yet.</p>
            </div>
          ) : (
            displayedOrders.map((order) => {
              const sectionKey = resolveStatusKey(order.status)

              return (
                <Link
                  key={order._id}
                  className="order-item"
                  to={`/orders/${sectionKey}/${order._id}`}
                  state={{ order }}
                >
                  <div className="order-item-body">
                    <p className="order-item-title">{formatName(order.owner)}</p>
                    <p className="order-item-meta">{formatAddress(order.address)}</p>
                  </div>
                  <span className="order-item-status">{order.status}</span>
                  <span className="order-item-chevron" aria-hidden="true" />
                </Link>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
