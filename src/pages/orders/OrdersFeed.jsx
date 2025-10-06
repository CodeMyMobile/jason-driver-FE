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

function groupOrders(orders) {
  return SECTION_CONFIG.map((section) => ({
    ...section,
    items: orders.filter((order) => order.status === section.status),
  }))
}

export default function OrdersFeed() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

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

  const sections = useMemo(() => groupOrders(orders), [orders])

  if (loading && orders.length === 0) {
    return (
      <div className="screen">
        <div className="spinner" aria-label="Loading orders" />
      </div>
    )
  }

  return (
    <div className="orders-screen">
      <div className="orders-toolbar">
        <div>
          <h1>Orders</h1>
          {lastUpdated ? (
            <p className="order-card-meta">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}
        </div>
        <div className="orders-actions">
          <button type="button" onClick={loadOrders} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="form-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="orders-list">
        {sections.map((section) => (
          <section className="order-section" key={section.key} aria-label={section.title}>
            <div className="order-section-header">
              <div>
                <h2 className="order-section-title">{section.title}</h2>
                <p className="order-card-meta">{section.description}</p>
              </div>
              <span className="order-section-count">{section.items.length}</span>
            </div>
            <div className="order-card-list">
              {section.items.length === 0 ? (
                <div className="order-card empty">
                  <p>No orders in this stage.</p>
                </div>
              ) : (
                section.items.map((order) => (
                  <Link
                    key={order._id}
                    className="order-card"
                    to={`/orders/${section.key}/${order._id}`}
                    state={{ order }}
                  >
                    <div className="order-card-content">
                      <p className="order-card-title">{formatName(order.owner)}</p>
                      <p className="order-card-meta">{formatAddress(order.address)}</p>
                    </div>
                    <span className="order-card-chevron" aria-hidden="true">
                      ➔
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
