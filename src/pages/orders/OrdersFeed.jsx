import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchOrders } from '../../services/orderService'
import { useOrdersSocket } from '../../ws/useOrdersSocket'
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

function sortOrdersByRecency(list) {
  return [...list].sort((a, b) => {
    const aTime = new Date(a?.assignedAt || a?.updatedAt || a?.createdAt || 0).getTime()
    const bTime = new Date(b?.assignedAt || b?.updatedAt || b?.createdAt || 0).getTime()

    return bTime - aTime
  })
}

export default function OrdersFeed() {
  const { token, user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [view, setView] = useState(SECTION_CONFIG[0].key)

  const isRefreshing = loading && orders.length > 0
  const driverChannel = user?._id || user?.id || null

  const loadOrders = useCallback(async () => {
    if (!token) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await fetchOrders(token)
      const list = Array.isArray(data) ? data : []
      setOrders(sortOrdersByRecency(list))
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

  const handleSocketEvent = useCallback(
    (eventName, payload) => {
      if (!payload) {
        loadOrders()
        return
      }

      if (Array.isArray(payload)) {
        setOrders(sortOrdersByRecency(payload))
        setLastUpdated(new Date())
        return
      }

      const orderId = payload?._id || payload?.id
      if (!orderId) {
        loadOrders()
        return
      }

      setOrders((current) => {
        const next = Array.isArray(current) ? [...current] : []
        const existingIndex = next.findIndex((item) => (item?._id || item?.id) === orderId)
        if (existingIndex >= 0) {
          next[existingIndex] = { ...next[existingIndex], ...payload }
          return sortOrdersByRecency(next)
        }
        return sortOrdersByRecency([payload, ...next])
      })
      setLastUpdated(new Date())
      setLoading(false)

      const shouldRefetch = ['ORDERS_UPDATED', 'ORDER_DELETED'].includes(eventName)

      if (shouldRefetch) {
        loadOrders()
      }
    },
    [loadOrders],
  )

  useOrdersSocket({
    driverChannel,
    enabled: Boolean(token),
    onEvent: handleSocketEvent,
  })

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
            aria-label={isRefreshing ? 'Refreshing orders' : 'Refresh orders'}
          >
            <svg
              aria-hidden="true"
              className={[
                'refresh-icon',
                isRefreshing ? 'refresh-icon--spinning' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              viewBox="0 0 24 24"
            >
              <path
                d="M16.5 7.5 21 3m0 0v5.25M21 3h-5.25m-2.25 3A7.5 7.5 0 0 0 5.4 5.4 7.5 7.5 0 0 0 3 12.75M7.5 16.5 3 21m0 0v-5.25M3 21h5.25M12.75 21a7.5 7.5 0 0 0 7.35-9.6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
              />
            </svg>
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
