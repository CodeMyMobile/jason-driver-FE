import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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

function formatOrderNumber(order) {
  if (!order) {
    return '—'
  }

  const candidate =
    order.orderNumber ||
    order.orderId ||
    order.orderNo ||
    order.order_id ||
    order.number ||
    order.reference ||
    order.shortId ||
    order.short_id ||
    null

  if (candidate) {
    return candidate.toString().replace(/^#/, '')
  }

  if (order.id) {
    const sanitized = order.id.toString().replace(/^#/, '')
    if (sanitized.length >= 6) {
      return sanitized.slice(-6)
    }

    return sanitized
  }

  if (order._id) {
    const suffix = order._id.toString().slice(-6)
    return suffix.toUpperCase()
  }

  return '—'
}

function resolveOrderTimestamp(order) {
  if (!order) {
    return null
  }

  return (
    order.createdAt ||
    order.created_at ||
    order.created ||
    order.orderDate ||
    order.order_date ||
    order.placedAt ||
    order.timestamp ||
    order.updatedAt ||
    null
  )
}

function formatElapsedTime(value) {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const diffMs = Date.now() - date.getTime()

  if (diffMs < 0) {
    return '00:00'
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getInitials(name) {
  if (!name) {
    return '??'
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return '??'
  }

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  return initials || parts[0].slice(0, 2).toUpperCase()
}

function formatPhoneNumber(phone) {
  if (!phone) {
    return null
  }

  const digits = phone.replace(/\D/g, '')

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  return phone
}

function normalizePhoneHref(phone) {
  if (!phone) {
    return null
  }

  const digits = phone.replace(/\D/g, '')

  if (!digits) {
    return `tel:${phone}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `tel:+${digits}`
  }

  if (digits.length === 10) {
    return `tel:+1${digits}`
  }

  return `tel:${digits}`
}

function buildAddressLines(address) {
  if (!address) {
    return ['No address provided']
  }

  if (typeof address === 'string') {
    return [address]
  }

  const lines = []

  const primaryStreet =
    address.street1 || address.street || address.address1 || address.line1 || address.formattedAddress
  if (primaryStreet) {
    lines.push(primaryStreet)
  }

  const secondaryStreet = address.street2 || address.address2 || address.line2
  if (secondaryStreet) {
    lines.push(secondaryStreet)
  }

  if (address.apartment) {
    lines.push(`Apt ${address.apartment}`)
  }

  if (address.description) {
    lines.push(address.description)
  }

  if (address.fullAddress) {
    lines.push(address.fullAddress)
  }

  const cityLine = [address.city, address.state, address.zip || address.postalCode]
    .filter(Boolean)
    .join(', ')

  if (cityLine) {
    lines.push(cityLine)
  }

  return lines.length > 0 ? Array.from(new Set(lines.filter(Boolean))) : ['No address provided']
}

function buildMapsLink(address) {
  if (!address) {
    return null
  }

  if (typeof address === 'string') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }

  const lines = buildAddressLines(address)
  const filtered = lines.filter((line) => line && line.toLowerCase() !== 'no address provided')

  if (filtered.length === 0) {
    return null
  }

  const query = filtered.join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function resolveItemName(item) {
  if (!item) {
    return null
  }

  if (typeof item === 'string') {
    return item
  }

  const product = item.product && typeof item.product === 'object' ? item.product : null

  const candidates = [
    item.name,
    item.title,
    item.productName,
    item.ProductName,
    item.itemName,
    item.displayName,
    item.productTitle,
    item.ProductTitle,
    item.product_description,
    item.productDescription,
    item.Description,
    item.description,
    item.itemLabel,
    item.variantName,
    item.variant,
    item.menuItem,
    item.Product,
    item.Item,
    item.label,
    item.item,
    item.productLabel,
    item.fullName,
    product?.name,
    product?.title,
    product?.Description,
    product?.productName,
    product?.ProductName,
    product?.itemName,
    product?.label,
    product?.description,
    product?.product_description,
    product?.productDescription,
    product?.displayName,
    product?.productTitle,
    product?.ProductTitle,
  ]

  const resolved = candidates.find((value) => typeof value === 'string' && value.trim().length > 0)

  if (resolved) {
    return resolved.trim()
  }

  if (typeof item.sku === 'string' && item.sku.trim()) {
    return item.sku.trim()
  }

  return null
}

function resolveItems(order) {
  if (!order) {
    return []
  }

  if (Array.isArray(order.products) && order.products.length > 0) {
    const quantities = Array.isArray(order.qty) ? order.qty : []

    return order.products.map((product, index) => {
      const quantity = Number.isFinite(quantities[index]) ? quantities[index] : product.quantity
      const name = resolveItemName(product)
      return {
        id: product.id || product._id || `${product.name}-${index}`,
        name: name || `Item ${index + 1}`,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      }
    })
  }

  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item, index) => ({
      id: item.id || item._id || `${item.name}-${index}`,
      name: resolveItemName(item) || `Item ${index + 1}`,
      quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
      price: item.price || item.amount,
    }))
  }

  if (order.cart && Array.isArray(order.cart.items) && order.cart.items.length > 0) {
    return order.cart.items.map((item, index) => ({
      id: item.id || item._id || `${item.name}-${index}`,
      name: resolveItemName(item) || `Item ${index + 1}`,
      quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
      price: item.price || item.amount,
    }))
  }

  return []
}

function resolveOrderTotal(order, items) {
  if (!order) {
    return null
  }

  const candidate =
    order.total ||
    order.totalAmount ||
    order.orderTotal ||
    order.amount ||
    order.totalDue ||
    (order.totals && (order.totals.grandTotal || order.totals.total)) ||
    (order.payment && order.payment.total)

  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return candidate
  }

  if (typeof candidate === 'string') {
    const parsed = Number.parseFloat(candidate.replace(/[^0-9.-]/g, ''))
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  const computed = items.reduce((sum, item) => {
    const priceRaw = item.price
    const price =
      typeof priceRaw === 'number'
        ? priceRaw
        : typeof priceRaw === 'string'
        ? Number.parseFloat(priceRaw.replace(/[^0-9.-]/g, ''))
        : null

    if (!Number.isFinite(price)) {
      return sum
    }

    const quantity = Number.isFinite(item.quantity) ? item.quantity : 1
    return sum + price * quantity
  }, 0)

  return Number.isFinite(computed) && computed > 0 ? computed : null
}

function formatCurrencyValue(value) {
  if (value == null) {
    return null
  }

  const number =
    typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''))

  if (!Number.isFinite(number)) {
    return null
  }

  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number)
}

function resolveContactPhone(order) {
  if (!order) {
    return null
  }

  return (
    order.owner?.phone ||
    order.owner?.phoneNumber ||
    order.owner?.mobile ||
    order.contactPhone ||
    order.phoneNumber ||
    order.phone ||
    null
  )
}

export default function OrdersFeed() {
  const { token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState(SECTION_CONFIG[0].key)

  const focusKey = location.state?.focus

  const isRefreshing = loading && orders.length > 0

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

  useEffect(() => {
    if (!focusKey) {
      return
    }

    const isValid = SECTION_CONFIG.some((section) => section.key === focusKey)
    if (!isValid) {
      return
    }

    setView((current) => (current === focusKey ? current : focusKey))
  }, [focusKey])

  const viewConfig = useMemo(
    () => SECTION_CONFIG.find((entry) => entry.key === view) ?? SECTION_CONFIG[0],
    [view],
  )

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

  const handleNavigateToOrder = useCallback(
    (sectionKey, orderData) => {
      if (!orderData?._id) {
        return
      }

      navigate(`/orders/${sectionKey}/${orderData._id}`, { state: { order: orderData } })
    },
    [navigate],
  )

  if (loading && orders.length === 0) {
    return (
      <div className="orders-loading">
        <div className="spinner" aria-label="Loading orders" />
      </div>
    )
  }

  const listClassName = ['orders-list', viewConfig.key === 'assigned' ? 'orders-list--assigned' : '']
    .filter(Boolean)
    .join(' ')

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

        <div className={listClassName} role="list">
          {displayedOrders.length === 0 ? (
            <div className="orders-empty" role="status">
              <p>No {viewConfig.status.toLowerCase()} orders yet.</p>
            </div>
          ) : (
            displayedOrders.map((order) => {
              const sectionKey = resolveStatusKey(order.status)

              if (viewConfig.key === 'assigned') {
                const orderNumber = formatOrderNumber(order)
                const contactName = formatName(order.owner)
                const contactPhone = resolveContactPhone(order)
                const phoneDisplay = formatPhoneNumber(contactPhone)
                const phoneHref = normalizePhoneHref(contactPhone)
                const addressLines = buildAddressLines(order.address)
                const mapsLink = buildMapsLink(order.address)
                const items = resolveItems(order)
                const orderTotalAmount = resolveOrderTotal(order, items)
                const orderTotalDisplay = formatCurrencyValue(orderTotalAmount)
                const timeSinceOrder = formatElapsedTime(resolveOrderTimestamp(order))
                const initials = getInitials(contactName)

                return (
                  <article
                    key={order._id}
                    className="assigned-order-card"
                    role="listitem"
                    aria-label={`Order ${orderNumber}`}
                  >
                    <header className="assigned-order-header">
                      <div className="assigned-order-heading">
                        <span className="assigned-order-label">Order</span>
                        <span className="assigned-order-number">#{orderNumber}</span>
                      </div>
                      {timeSinceOrder ? (
                        <div className="assigned-order-timer" aria-label="Time since order">
                          <span className="assigned-order-timer-label">Time since order</span>
                          <span className="assigned-order-timer-value">{timeSinceOrder}</span>
                        </div>
                      ) : null}
                    </header>

                    <section className="assigned-order-section" aria-label="Customer details">
                      <div className="assigned-order-customer">
                        <span className="assigned-order-avatar" aria-hidden="true">
                          {initials}
                        </span>
                        <div className="assigned-order-contact">
                          <p className="assigned-order-name">{contactName}</p>
                          {phoneDisplay ? (
                            <a
                              href={phoneHref ?? undefined}
                              className="assigned-order-phone"
                              onClick={(event) => event.stopPropagation?.()}
                            >
                              {phoneDisplay}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    <section className="assigned-order-section" aria-label="Delivery address">
                      <p className="assigned-order-section-title">Delivery Address</p>
                      <address className="assigned-order-address">
                        {addressLines.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </address>
                      {mapsLink ? (
                        <div className="assigned-order-address-actions">
                          <a
                            href={mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="assigned-order-map-link"
                            onClick={(event) => event.stopPropagation?.()}
                          >
                            <span aria-hidden="true" className="assigned-order-map-icon" />
                            <span>Google Maps</span>
                          </a>
                        </div>
                      ) : null}
                    </section>

                    <section className="assigned-order-section" aria-label="Order items">
                      <p className="assigned-order-section-title">Order Items</p>
                      <ul className="assigned-order-items">
                        {items.length > 0 ? (
                          items.map((item) => (
                            <li key={item.id} className="assigned-order-item">
                              <span className="assigned-order-item-name">{item.name}</span>
                              <span className="assigned-order-item-quantity">{item.quantity}x</span>
                            </li>
                          ))
                        ) : (
                          <li className="assigned-order-item empty">No items listed.</li>
                        )}
                      </ul>
                    </section>

                    <footer className="assigned-order-footer">
                      <div className="assigned-order-total">
                        <span className="assigned-order-total-label">Order Total</span>
                        <span className="assigned-order-total-value">{orderTotalDisplay ?? '—'}</span>
                      </div>
                      <button
                        type="button"
                        className="assigned-order-accept"
                        onClick={() => handleNavigateToOrder(sectionKey, order)}
                      >
                        Accept Order
                      </button>
                    </footer>
                  </article>
                )
              }

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
