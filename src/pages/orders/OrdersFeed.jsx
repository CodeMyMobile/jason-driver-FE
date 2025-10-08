import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchOrders, updateOrderStatus } from '../../services/orderService'
import './Orders.css'

const TAB_CONFIG = [
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

function formatName(owner) {
  if (!owner) {
    return 'Unknown customer'
  }

  return [owner?.name?.first, owner?.name?.last].filter(Boolean).join(' ') || 'Unknown customer'
}

function formatInitials(owner) {
  if (!owner) {
    return 'DR'
  }
  const initials = [owner?.name?.first?.[0], owner?.name?.last?.[0]].filter(Boolean).join('')
  return initials || 'DR'
}

function formatAddress(address) {
  if (!address) {
    return 'No address on file'
  }

  const parts = []

  if (address.street) {
    parts.push(address.street)
  }

  if (address.apartment) {
    parts.push(`Apt ${address.apartment}`)
  }

  if (address.city || address.state) {
    parts.push([address.city, address.state].filter(Boolean).join(', '))
  }

  if (address.description) {
    parts.push(address.description)
  }

  return parts.join(' · ') || 'No address on file'
}

function formatElapsedTime(createdAt) {
  if (!createdAt) {
    return null
  }

  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) {
    return null
  }

  const diffMs = Date.now() - created.getTime()
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000))
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }
  return `${minutes.toString().padStart(2, '0')}m`
}

function getTimerVariant(createdAt) {
  const created = createdAt ? new Date(createdAt) : null
  if (!created || Number.isNaN(created.getTime())) {
    return 'normal'
  }
  const elapsedMinutes = (Date.now() - created.getTime()) / 60000
  if (elapsedMinutes > 40) {
    return 'priority'
  }
  if (elapsedMinutes > 25) {
    return 'warning'
  }
  return 'normal'
}

function getRouteKey(order) {
  const status = order?.status?.toLowerCase()
  if (!status) {
    return 'assigned'
  }
  if (status.includes('assign')) {
    return 'assigned'
  }
  if (status.includes('accept')) {
    return 'accepted'
  }
  if (status.includes('progress')) {
    return 'progress'
  }
  if (status.includes('complete')) {
    return 'progress'
  }
  return 'assigned'
}

function formatCurrency(value) {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return `$${value.toFixed(2)}`
  }
  if (typeof value === 'string') {
    return value.startsWith('$') ? value : `$${value}`
  }
  return '$0.00'
}

function extractItems(order) {
  if (!Array.isArray(order?.products)) {
    return []
  }
  return order.products.map((product, index) => ({
    id: product._id ?? index,
    name: product.Description || product.name || 'Item',
    quantity: order.qty?.[index] ?? product.quantity ?? 1,
  }))
}

export default function OrdersFeed() {
  const { token } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [acceptingId, setAcceptingId] = useState(null)

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

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === 'Assigned'),
    [orders],
  )
  const activeOrders = useMemo(
    () => orders.filter((order) => order.status === 'Accepted' || order.status === 'In Progress'),
    [orders],
  )
  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === 'Completed'),
    [orders],
  )

  const badgeCount = pendingOrders.length

  const handleAccept = async (order) => {
    if (!token || !order?._id) {
      return
    }
    setAcceptingId(order._id)
    try {
      await updateOrderStatus(order._id, 'Accepted', token)
      await loadOrders()
      setActiveTab('active')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to accept order.'
      setError(message)
    } finally {
      setAcceptingId(null)
    }
  }

  const renderPendingCard = (order) => {
    const items = extractItems(order).slice(0, 3)
    const total = formatCurrency(order.total ?? order.orderTotal ?? order.paymentTotal)
    const timer = formatElapsedTime(order.createdAt)
    const timerVariant = getTimerVariant(order.createdAt)
    const routeKey = getRouteKey(order)

    return (
      <Link
        key={order._id}
        to={`/orders/${routeKey}/${order._id}`}
        state={{ order }}
        className={`order-card ${timerVariant === 'priority' ? 'priority' : ''}`}
      >
        <div className="order-header">
          <span className="order-number">Order #{order.orderId || order._id?.slice(-6)}</span>
          {timer ? (
            <div className="order-timer">
              <div className={`timer-display ${timerVariant}`}>
                <span className="timer-value">{timer}</span>
              </div>
              <span className="timer-label">Time Since Order</span>
            </div>
          ) : null}
        </div>
        <div className="customer-info">
          <div className="customer-avatar">{formatInitials(order.owner)}</div>
          <div className="customer-details">
            <h3>{formatName(order.owner)}</h3>
            {order.owner?.phone ? (
              <p>
                <a className="phone-link" href={`tel:${order.owner.phone}`}>
                  📱 {order.owner.phone}
                </a>
              </p>
            ) : null}
          </div>
        </div>
        <div className="order-total">
          <span>Order Total</span>
          <span>{total}</span>
        </div>
        {items.length > 0 ? (
          <ul className="order-items">
            {items.map((item) => (
              <li key={item.id} className="order-item">
                <span className="item-quantity">{item.quantity}×</span>
                <span className="item-name">{item.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="action-btn accept-btn"
          onClick={(event) => {
            event.preventDefault()
            handleAccept(order)
          }}
          disabled={acceptingId === order._id}
        >
          {acceptingId === order._id ? 'Accepting…' : 'Accept Order →'}
        </button>
      </Link>
    )
  }

  const renderActiveCard = (order) => {
    const items = extractItems(order).slice(0, 2)
    const timer = formatElapsedTime(order.createdAt)
    const routeKey = getRouteKey(order)
    return (
      <Link
        key={order._id}
        to={`/orders/${routeKey}/${order._id}`}
        state={{ order }}
        className="order-card"
      >
        <div className="order-header">
          <span className="order-number">Order #{order.orderId || order._id?.slice(-6)}</span>
          {timer ? (
            <div className="order-timer">
              <div className="timer-display warning">
                <span className="timer-value">{timer}</span>
              </div>
              <span className="timer-label">Time Since Order</span>
            </div>
          ) : null}
        </div>
        <div className="customer-info">
          <div className="customer-avatar">{formatInitials(order.owner)}</div>
          <div className="customer-details">
            <h3>{formatName(order.owner)}</h3>
            <p>{formatAddress(order.address)}</p>
          </div>
        </div>
        {items.length > 0 ? (
          <ul className="order-items">
            {items.map((item) => (
              <li key={item.id} className="order-item">
                <span className="item-quantity">{item.quantity}×</span>
                <span className="item-name">{item.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <button type="button" className="action-btn primary" onClick={(event) => event.preventDefault()}>
          View Order →
        </button>
      </Link>
    )
  }

  const renderCompletedCard = (order) => {
    const routeKey = getRouteKey(order)
    return (
      <Link
        key={order._id}
        to={`/orders/${routeKey}/${order._id}`}
        state={{ order }}
        className="order-card"
      >
        <div className="order-header">
          <span className="order-number">Order #{order.orderId || order._id?.slice(-6)}</span>
          <span className="order-status-tag">Completed</span>
        </div>
        <div className="customer-info">
          <div className="customer-avatar">{formatInitials(order.owner)}</div>
          <div className="customer-details">
            <h3>{formatName(order.owner)}</h3>
            <p>{formatAddress(order.address)}</p>
          </div>
        </div>
      </Link>
    )
  }

  const renderTabContent = () => {
    if (activeTab === 'pending') {
      if (pendingOrders.length === 0) {
        return <p className="empty-state">No pending orders.</p>
      }
      return <div className="orders-list">{pendingOrders.map(renderPendingCard)}</div>
    }
    if (activeTab === 'active') {
      if (activeOrders.length === 0) {
        return <p className="empty-state">No active deliveries.</p>
      }
      return <div className="orders-list">{activeOrders.map(renderActiveCard)}</div>
    }
    if (completedOrders.length === 0) {
      return <p className="empty-state">No completed orders yet.</p>
    }
    return <div className="orders-list">{completedOrders.map(renderCompletedCard)}</div>
  }

  if (loading && orders.length === 0) {
    return (
      <div className="screen">
        <div className="spinner" aria-label="Loading orders" />
      </div>
    )
  }

  return (
    <div className="orders-page">
      <div className="orders-toolbar">
        <div>
          <h1>Orders</h1>
          {lastUpdated ? (
            <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>
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

      <div className="tabs" role="tablist">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span>{tab.label}</span>
            {tab.id === 'pending' && badgeCount > 0 ? <span className="tab-badge">{badgeCount}</span> : null}
          </button>
        ))}
      </div>

      <div className="orders-content">{renderTabContent()}</div>
    </div>
  )
}
