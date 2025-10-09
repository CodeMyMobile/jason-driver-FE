import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchOrders } from '../../services/orderService'
import './Orders.css'

const ACTIVE_STATUSES = ['Assigned', 'Accepted', 'In Progress']

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
    return 'assigned'
  }

  const normalized = status.toLowerCase()

  if (normalized === 'assigned') {
    return 'assigned'
  }

  if (normalized === 'accepted') {
    return 'accepted'
  }

  if (normalized === 'in progress') {
    return 'progress'
  }

  return 'assigned'
}

export default function OrdersFeed() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [view, setView] = useState('active')

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

  const activeOrders = useMemo(
    () => orders.filter((order) => ACTIVE_STATUSES.includes(order.status)),
    [orders],
  )

  const archivedOrders = useMemo(
    () => orders.filter((order) => !ACTIVE_STATUSES.includes(order.status)),
    [orders],
  )

  const displayedOrders = view === 'active' ? activeOrders : archivedOrders
  const summaryLabel = view === 'active' ? 'orders waiting on you' : 'orders archived'

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

        <div className="orders-tabs" role="tablist" aria-label="Order view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'active'}
            className={['orders-tab', view === 'active' ? 'active' : ''].filter(Boolean).join(' ')}
            onClick={() => setView('active')}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'archived'}
            className={['orders-tab', view === 'archived' ? 'active' : ''].filter(Boolean).join(' ')}
            onClick={() => setView('archived')}
          >
            Archived
          </button>
        </div>

        <div className="orders-summary">
          <div>
            <span className="summary-count">{displayedOrders.length}</span>
            <span className="summary-label">{summaryLabel}</span>
          </div>
          {lastUpdated ? (
            <p className="summary-meta">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="orders-list" role="list">
          {displayedOrders.length === 0 ? (
            <div className="orders-empty" role="status">
              <p>No orders waiting on you.</p>
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
