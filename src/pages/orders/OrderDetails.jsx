import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LoaderOverlay from '../../components/LoaderOverlay'
import { useAuth } from '../../context/AuthContext'
import { fetchCardDetails, fetchOrderById, updateOrder, updateOrderStatus } from '../../services/orderService'
import './Orders.css'

export const STATUS_VARIANTS = {
  assigned: {
    key: 'assigned',
    statusLabel: 'Assigned',
    pillClass: 'assigned',
    primaryActionLabel: 'Accept Order',
    primaryActionStatus: 'Accepted',
    showMap: false,
    showCardDetails: false,
    showFinalizeActions: false,
  },
  accepted: {
    key: 'accepted',
    statusLabel: 'Accepted',
    pillClass: 'accepted',
    primaryActionLabel: 'Start Delivery',
    primaryActionStatus: 'In Progress',
    showMap: true,
    showCardDetails: false,
    showFinalizeActions: false,
  },
  progress: {
    key: 'progress',
    statusLabel: 'In Progress',
    pillClass: 'progress',
    primaryActionLabel: null,
    primaryActionStatus: null,
    showMap: true,
    showCardDetails: true,
    showFinalizeActions: true,
  },
}

export const STATUS_TABS = [
  { key: 'assigned', label: 'Pending' },
  { key: 'accepted', label: 'Active' },
  { key: 'progress', label: 'Completed' },
]

function inferStatusKey(status) {
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

function formatName(owner) {
  if (!owner) {
    return 'Customer'
  }

  return [owner?.name?.first, owner?.name?.last].filter(Boolean).join(' ') || 'Customer'
}

function formatDate(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US').format(parsed)
}

function buildMapUrl(address) {
  if (!address?.loc || address.loc.length < 2) {
    return null
  }

  const [longitude, latitude] = address.loc

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null
  }

  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: '16',
    size: '600x350',
    markers: `${latitude},${longitude},lightblue1`,
  })

  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`
}

function formatAddress(address) {
  if (!address) {
    return 'No address on file'
  }

  const parts = []

  if (address.apartment) {
    parts.push(`Apartment #: ${address.apartment}`)
  }

  if (address.description) {
    parts.push(address.description)
  }

  return parts.join(', ') || 'No address on file'
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

function buildMapLinks(address) {
  if (!address) {
    return { google: null, apple: null }
  }

  let latitude = null
  let longitude = null

  if (Array.isArray(address.loc) && address.loc.length >= 2) {
    const [lng, lat] = address.loc
    if (typeof lat === 'number' && typeof lng === 'number') {
      latitude = lat
      longitude = lng
    }
  }

  if (typeof address.latitude === 'number' && typeof address.longitude === 'number') {
    latitude = address.latitude
    longitude = address.longitude
  }

  if (typeof address.lat === 'number' && typeof address.lng === 'number') {
    latitude = address.lat
    longitude = address.lng
  }

  const query = buildAddressLines(address)
    .filter((line) => line && line !== 'No address provided')
    .join(', ')
  const encodedQuery = query ? encodeURIComponent(query) : null

  const googleBase = 'https://www.google.com/maps/search/?api=1'
  const appleBase = 'https://maps.apple.com/'

  const google =
    latitude != null && longitude != null
      ? `${googleBase}&query=${latitude},${longitude}`
      : encodedQuery
      ? `${googleBase}&query=${encodedQuery}`
      : null

  const apple =
    latitude != null && longitude != null
      ? `${appleBase}?ll=${latitude},${longitude}`
      : encodedQuery
      ? `${appleBase}?q=${encodedQuery}`
      : null

  return { google, apple }
}

function formatOrderNumber(order) {
  if (!order) {
    return '#—'
  }

  const candidate =
    order.orderNumber ||
    order.orderId ||
    order.orderNo ||
    order.order_id ||
    order.number ||
    order.reference ||
    order.shortId ||
    order.short_id

  if (candidate) {
    const sanitized = candidate.toString().replace(/^#/, '')
    return `#${sanitized}`.toUpperCase()
  }

  if (order.id) {
    const sanitized = order.id.toString().replace(/^#/, '')
    return `#${sanitized}`.toUpperCase()
  }

  if (order._id) {
    const suffix = order._id.toString().slice(-6)
    return `#${suffix.toUpperCase()}`
  }

  return '#—'
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

function resolveItems(order) {
  if (!order) {
    return []
  }

  if (Array.isArray(order.products) && order.products.length > 0) {
    const quantities = Array.isArray(order.qty) ? order.qty : []

    return order.products.map((product, index) => {
      const quantityCandidate =
        quantities[index] ?? product.quantity ?? product.qty ?? product.Qty ?? product.count ?? 1
      const quantity = Number.isFinite(quantityCandidate) ? quantityCandidate : 1

      const name =
        product.Description ||
        product.description ||
        product.name ||
        product.ProductName ||
        product.title ||
        'Item'

      return {
        id: product._id ?? product.id ?? product.productId ?? `${name}-${index}`,
        name,
        quantity,
        price: product.PriceB || product.price || product.Price || product.unitPrice || null,
      }
    })
  }

  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item, index) => ({
      id: item.id ?? item.itemId ?? `${item.name ?? 'item'}-${index}`,
      name: item.name || item.Description || item.description || item.title || 'Item',
      quantity: item.quantity ?? item.qty ?? item.count ?? 1,
      price: item.price ?? item.amount ?? item.total ?? null,
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

function resolvePrimaryButtonLabel(variant) {
  if (!variant?.primaryActionStatus) {
    return null
  }

  if (variant.primaryActionStatus === 'Accepted') {
    return 'Accept Order'
  }

  if (variant.primaryActionStatus === 'In Progress') {
    return 'Start Delivery'
  }

  return variant.primaryActionLabel ?? null
}

export default function OrderDetails({ previewOrder = null, previewMode = false, onStatusSelect = null }) {
  const { status: routeStatusKey, orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()

  const initialOrder = previewOrder ?? location.state?.order ?? null

  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(!initialOrder)
  const [error, setError] = useState(null)
  const [cardDetails, setCardDetails] = useState(null)
  const [cardError, setCardError] = useState(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState(null)

  const resolvedStatusKey = useMemo(() => {
    const normalized = routeStatusKey?.toLowerCase()
    if (normalized && STATUS_VARIANTS[normalized]) {
      return normalized
    }

    return inferStatusKey(order?.status)
  }, [routeStatusKey, order?.status])

  const variant = STATUS_VARIANTS[resolvedStatusKey] ?? STATUS_VARIANTS.assigned
  const requiresCardDetails = variant.showCardDetails
  const canPerformOrderActions = Boolean(token) && !previewMode

  const timeReference = useMemo(() => resolveOrderTimestamp(order), [order])
  const [timeSinceOrder, setTimeSinceOrder] = useState(() => formatElapsedTime(timeReference))
  const [isExpanded, setIsExpanded] = useState(
    () => variant.showMap || variant.showFinalizeActions || false,
  )

  useEffect(() => {
    if (variant.showMap || variant.showFinalizeActions) {
      setIsExpanded(true)
    }
  }, [variant.showFinalizeActions, variant.showMap])

  useEffect(() => {
    if (!previewOrder) {
      return
    }

    setOrder(previewOrder)
    setLoading(false)
  }, [previewOrder])

  useEffect(() => {
    let ignore = false

    async function loadOrderDetails() {
      if (!token || !orderId || previewMode || previewOrder) {
        return
      }

      setLoading(!initialOrder)
      setError(null)

      try {
        const data = await fetchOrderById(orderId, token)
        if (!ignore && data) {
          setOrder(data)
        }
      } catch (err) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : 'Unable to load order details.'
          setError(message)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadOrderDetails()

    return () => {
      ignore = true
    }
  }, [token, orderId, initialOrder, previewMode, previewOrder])

  useEffect(() => {
    setTimeSinceOrder(formatElapsedTime(timeReference))

    if (!timeReference) {
      return () => {}
    }

    const intervalId = setInterval(() => {
      setTimeSinceOrder(formatElapsedTime(timeReference))
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [timeReference])

  useEffect(() => {
    let ignore = false

    async function loadCardDetails() {
      if (previewMode) {
        setCardDetails(previewOrder?.cardDetails ?? null)
        setCardError(null)
        setCardLoading(false)
        return
      }

      if (!requiresCardDetails || !order || !token) {
        setCardDetails(null)
        setCardError(null)
        setCardLoading(false)
        return
      }

      const reference = order.creditCard || order.paymentMethod

      if (!reference) {
        setCardDetails(null)
        setCardLoading(false)
        return
      }

      setCardLoading(true)
      setCardError(null)

      try {
        const details = await fetchCardDetails(order.owner?.stripeID, reference, token)
        if (!ignore) {
          setCardDetails(details)
        }
      } catch (err) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : 'Unable to load card details.'
          setCardError(message)
        }
      } finally {
        if (!ignore) {
          setCardLoading(false)
        }
      }
    }

    loadCardDetails()

    return () => {
      ignore = true
    }
  }, [order, token, requiresCardDetails, variant.showCardDetails, previewMode, previewOrder])

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleTabSelect = useCallback(
    (tabKey) => {
      if (!tabKey) {
        return
      }

      if (previewMode) {
        onStatusSelect?.(tabKey)
        return
      }

      navigate('/orders', { state: { focus: tabKey } })
    },
    [navigate, onStatusSelect, previewMode],
  )

  const handlePrimaryAction = useCallback(async () => {
    if (!order || !variant.primaryActionStatus || !token || previewMode) {
      return
    }

    setActionLoading(true)
    setInfoMessage(null)

    try {
      await updateOrderStatus(order._id, variant.primaryActionStatus, token)
      navigate('/orders', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update order.'
      setInfoMessage({ type: 'error', text: message })
    } finally {
      setActionLoading(false)
    }
  }, [navigate, order, token, variant.primaryActionStatus, previewMode])

  const handleCancelOrder = useCallback(async () => {
    if (!order || !token || previewMode) {
      return
    }

    const confirmCancel = window.confirm('Are you sure you want to cancel this order?')

    if (!confirmCancel) {
      return
    }

    setActionLoading(true)
    setInfoMessage(null)

    try {
      await updateOrder(
        {
          _id: order._id,
          status: 'Canceled',
        },
        token,
      )
      navigate('/orders', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to cancel order.'
      setInfoMessage({ type: 'error', text: message })
    } finally {
      setActionLoading(false)
    }
  }, [navigate, order, token, previewMode])

  const navigateToBypass = useCallback(() => {
    if (!order || previewMode) {
      return
    }

    navigate(`/orders/${resolvedStatusKey}/${order._id}/bypass`, {
      state: { order },
    })
  }, [navigate, order, resolvedStatusKey, previewMode])

  const navigateToCamera = useCallback(() => {
    if (!order || previewMode) {
      return
    }

    navigate(`/orders/${resolvedStatusKey}/${order._id}/camera`, {
      state: { order },
    })
  }, [navigate, order, resolvedStatusKey, previewMode])

  const navigateToCancel = useCallback(() => {
    if (!order || previewMode) {
      return
    }

    navigate(`/orders/${resolvedStatusKey}/${order._id}/cancel`, {
      state: { order, reason: 'No answer at door' },
    })
  }, [navigate, order, resolvedStatusKey, previewMode])

  if (loading && !order) {
    return (
      <div className="screen">
        <div className="spinner" aria-label="Loading order" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="screen">
        <div className="form-error" role="alert">
          {error || 'Order not found.'}
        </div>
      </div>
    )
  }

  const items = resolveItems(order)
  const orderTotalAmount = resolveOrderTotal(order, items)
  const orderTotalDisplay = formatCurrencyValue(orderTotalAmount)
  const overlayLabel = 'Updating order…'
  const showOverlay = actionLoading && canPerformOrderActions
  const disablePrimaryAction = !canPerformOrderActions || actionLoading
  const disableSecondaryActions = !canPerformOrderActions
  const mapUrl = variant.showMap ? buildMapUrl(order.address) : null

  const contactName = formatName(order.owner)
  const rawPhone =
    order.owner?.phone ||
    order.owner?.phoneNumber ||
    order.owner?.mobile ||
    order.contactPhone ||
    order.phoneNumber ||
    order.phone ||
    null
  const formattedPhone = formatPhoneNumber(rawPhone)
  const phoneHref = normalizePhoneHref(rawPhone)
  const addressLines = buildAddressLines(order.address)
  const { google: googleMapsUrl, apple: appleMapsUrl } = buildMapLinks(order.address)
  const primaryButtonLabel = resolvePrimaryButtonLabel(variant)
  const showDeliveryDetails = Boolean(
    order.deliveryNote ||
    order.owner?.email ||
    order.owner?.dob ||
    rawPhone ||
    order.giftDelivery ||
    (variant.showCardDetails && (cardDetails || cardLoading)) ||
    cardError,
  )
  const primaryAddressLine = addressLines[0] ?? 'No address provided'
  const secondaryAddressHint =
    addressLines.length > 1 ? addressLines.slice(1, 3).join(', ') : null

  return (
    <div className="order-detail-screen">
      <LoaderOverlay show={showOverlay} label={overlayLabel} />

      <header className="order-detail-header" aria-label="Driver portal header">
        <div className="order-detail-brand">
          <div className="order-detail-brand-text">
            <span className="order-detail-brand-title">Jason's Delivery</span>
            <span className="order-detail-brand-subtitle">Driver Portal</span>
          </div>
          <div className="order-detail-badge" aria-label="Program: 7oct test">
            <span className="order-detail-badge-label">7oct test</span>
            <span className="order-detail-badge-icon" aria-hidden="true">🛰️</span>
          </div>
        </div>
        <nav className="order-detail-tabs" aria-label="Order status tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={['order-detail-tab', tab.key === resolvedStatusKey ? 'active' : '']
                .filter(Boolean)
                .join(' ')}
              aria-pressed={tab.key === resolvedStatusKey}
              onClick={() => handleTabSelect(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <section
        className={`order-ticket ${isExpanded ? 'expanded' : 'collapsed'}`}
        aria-labelledby="order-ticket-heading"
      >
        <header className="order-ticket-header">
          <div>
            <p className="order-ticket-label">Order</p>
            <h1 className="order-ticket-number" id="order-ticket-heading">
              {formatOrderNumber(order)}
            </h1>
          </div>
          <div className="order-ticket-controls">
            {timeSinceOrder ? (
              <div className="order-ticket-timer">
                <span className="order-ticket-timer-value">{timeSinceOrder}</span>
                <span className="order-ticket-timer-label">Time since order</span>
              </div>
            ) : null}
            <button
              type="button"
              className="order-collapse-toggle"
              onClick={toggleExpanded}
              aria-expanded={isExpanded}
            >
              {isExpanded ? 'Hide details' : 'View details'}
              <span aria-hidden="true">{isExpanded ? '▴' : '▾'}</span>
            </button>
          </div>
        </header>

        {variant.statusLabel ? (
          <span className={`order-status-pill ${variant.pillClass}`}>{variant.statusLabel}</span>
        ) : null}

        <div className="order-compact-grid">
          <div className="order-compact-card">
            <span className="order-compact-label">Customer</span>
            <span className="order-compact-value">{contactName}</span>
            {formattedPhone ? (
              <a href={phoneHref} className="order-compact-call">
                Call customer
              </a>
            ) : null}
          </div>
          <div className="order-compact-card">
            <span className="order-compact-label">Dropoff</span>
            <span className="order-compact-value">{primaryAddressLine}</span>
            {secondaryAddressHint ? (
              <span className="order-compact-hint">{secondaryAddressHint}</span>
            ) : null}
          </div>
          {orderTotalDisplay ? (
            <div className="order-compact-card">
              <span className="order-compact-label">Total</span>
              <span className="order-compact-value">{orderTotalDisplay}</span>
            </div>
          ) : null}
        </div>

        {!isExpanded ? (
          <div className="order-compact-actions">
            {primaryButtonLabel ? (
              <button
                type="button"
                className="order-action-button compact"
                onClick={handlePrimaryAction}
                disabled={disablePrimaryAction}
              >
                {primaryButtonLabel}
                <span className="order-action-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="order-contact">
              <div className="order-avatar" aria-hidden="true">
                {getInitials(contactName)}
              </div>
              <div className="order-contact-details">
                <p className="order-contact-name">{contactName}</p>
                {formattedPhone ? (
                  <a href={phoneHref} className="order-contact-phone">
                    {formattedPhone}
                  </a>
                ) : null}
              </div>
            </div>

            <section className="order-section" aria-label="Delivery address">
              <h2 className="order-section-title">Delivery Address</h2>
              <address className="order-address">
                {addressLines.map((line, index) => (
                  <span key={`${line}-${index}`}>{line}</span>
                ))}
              </address>
              {googleMapsUrl || appleMapsUrl ? (
                <div className="order-map-links">
                  {googleMapsUrl ? (
                    <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                      Google Maps
                    </a>
                  ) : null}
                  {appleMapsUrl ? (
                    <a href={appleMapsUrl} target="_blank" rel="noreferrer">
                      Apple Maps
                    </a>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="order-section" aria-label="Order items">
              <h2 className="order-section-title">Order Items</h2>
              <ul className="order-items-list">
                {items.length > 0 ? (
                  items.map((item) => (
                    <li key={item.id} className="order-item-row">
                      <span className="order-item-name">{item.name}</span>
                      <span className="order-item-quantity">{item.quantity}x</span>
                    </li>
                  ))
                ) : (
                  <li className="order-item-row order-item-row-empty">No items listed.</li>
                )}
              </ul>
            </section>

            <footer className="order-ticket-footer">
              <div className="order-total">
                <span className="order-total-label">Order Total</span>
                <span className="order-total-value">{orderTotalDisplay ?? '—'}</span>
              </div>
              {primaryButtonLabel ? (
              <button
                  type="button"
                  className="order-action-button"
                  onClick={handlePrimaryAction}
                  disabled={disablePrimaryAction}
                >
                  {primaryButtonLabel}
                  <span className="order-action-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ) : null}
            </footer>
          </>
        )}
      </section>

      {infoMessage ? (
        <p className={`notice ${infoMessage.type}`} role="status">
          {infoMessage.text}
        </p>
      ) : null}

      {error && order ? (
        <div className="form-error" role="alert">
          {error}
        </div>
      ) : null}

      {isExpanded && (mapUrl || showDeliveryDetails || variant.showFinalizeActions) ? (
        <div className="order-detail-sections">
          {mapUrl ? (
            <section className="order-info-card" aria-label="Delivery map">
              <h2 className="order-info-title">Delivery Map</h2>
              <div className="order-map-preview">
                <img src={mapUrl} alt="Delivery location map" loading="lazy" />
              </div>
            </section>
          ) : null}

          {showDeliveryDetails ? (
            <section className="order-info-card" aria-label="Delivery details">
              <h2 className="order-info-title">Delivery Details</h2>
              {order.deliveryNote ? (
                <p className="order-info-text">
                  <strong>Notes:</strong> {order.deliveryNote}
                </p>
              ) : null}
              <div className="order-detail-grid">
                <span>
                  <strong>Customer:</strong> {contactName}
                </span>
                <span>
                  <strong>Orders Count:</strong> {order.owner?.orderCount ?? 0}{' '}
                  {order.owner?.orderCount === 1 ? (
                    <span className="order-badge">New Customer</span>
                  ) : null}
                </span>
                <span>
                  <strong>Address:</strong> {formatAddress(order.address)}
                </span>
                {order.owner?.email ? (
                  <span>
                    <strong>Email:</strong> {order.owner.email}
                  </span>
                ) : null}
                {order.owner?.dob ? (
                  <span>
                    <strong>DOB:</strong> {formatDate(order.owner.dob)}
                  </span>
                ) : null}
                {rawPhone ? (
                  <span>
                    <strong>Phone:</strong>{' '}
                    <a href={phoneHref} rel="noreferrer">
                      {formattedPhone || rawPhone}
                    </a>
                  </span>
                ) : null}
                <span>
                  <strong>Gift Delivery:</strong> {order.giftDelivery ? 'Yes' : 'No'}
                </span>
                {order.giftDelivery && order.giftDeliveryDetails ? (
                  <>
                    {order.giftDeliveryDetails.recipientName ? (
                      <span>
                        <strong>Recipient Name:</strong> {order.giftDeliveryDetails.recipientName}
                      </span>
                    ) : null}
                    {order.giftDeliveryDetails.recipientPhone ? (
                      <span>
                        <strong>Recipient Phone:</strong>{' '}
                        <a href={normalizePhoneHref(order.giftDeliveryDetails.recipientPhone)} rel="noreferrer">
                          {formatPhoneNumber(order.giftDeliveryDetails.recipientPhone) ||
                            order.giftDeliveryDetails.recipientPhone}
                        </a>
                      </span>
                    ) : null}
                    {order.giftDeliveryDetails.recipientBusinessName ? (
                      <span>
                        <strong>Recipient Business:</strong> {order.giftDeliveryDetails.recipientBusinessName}
                      </span>
                    ) : null}
                    {order.giftDeliveryDetails.senderName ? (
                      <span>
                        <strong>Sender Name:</strong> {order.giftDeliveryDetails.senderName}
                      </span>
                    ) : null}
                    {order.giftDeliveryDetails.senderPhone ? (
                      <span>
                        <strong>Sender Phone:</strong>{' '}
                        <a href={normalizePhoneHref(order.giftDeliveryDetails.senderPhone)} rel="noreferrer">
                          {formatPhoneNumber(order.giftDeliveryDetails.senderPhone) ||
                            order.giftDeliveryDetails.senderPhone}
                        </a>
                      </span>
                    ) : null}
                    {order.giftDeliveryDetails.senderDOB ? (
                      <span>
                        <strong>Sender DOB:</strong> {formatDate(order.giftDeliveryDetails.senderDOB)}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
              {cardError ? (
                <p className="notice error" role="alert">
                  {cardError}
                </p>
              ) : null}
              {variant.showCardDetails && cardDetails ? (
                <div className="order-detail-grid" style={{ marginTop: '0.75rem' }}>
                  <span>
                    <strong>Last 4:</strong> **** **** **** {cardDetails.last4 || '—'}{' '}
                    {order.fromWallet ? (
                      <span className="order-badge order-badge-wallet">{order.walletMethod}</span>
                    ) : null}
                  </span>
                  <span>
                    <strong>Expiration:</strong> {cardDetails.exp_month}/{cardDetails.exp_year}
                  </span>
                </div>
              ) : null}
              {cardLoading ? <p className="order-card-meta">Loading payment details…</p> : null}
            </section>
          ) : null}

          {variant.showFinalizeActions ? (
            <section className="order-info-card" aria-label="Finalize order actions">
              <h2 className="order-info-title">Finalize</h2>
              <div className="order-action-grid">
                <button
                  type="button"
                  className="order-secondary-button"
                  onClick={navigateToBypass}
                  disabled={disableSecondaryActions}
                >
                  Bypass
                </button>
                <button
                  type="button"
                  className="order-secondary-button"
                  onClick={navigateToCamera}
                  disabled={disableSecondaryActions}
                >
                  Verify Info
                </button>
                <button
                  type="button"
                  className="order-secondary-button"
                  onClick={navigateToCancel}
                  disabled={disableSecondaryActions}
                >
                  No Answer
                </button>
                <button
                  type="button"
                  className="order-secondary-button destructive"
                  onClick={handleCancelOrder}
                  disabled={disableSecondaryActions}
                >
                  Cancel Order
                </button>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
