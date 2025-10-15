import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LoaderOverlay from '../../components/LoaderOverlay'
import { useAuth } from '../../context/AuthContext'
import { fetchCardDetails, fetchOrderById, updateOrder, updateOrderStatus } from '../../services/orderService'
import './Orders.css'

const STATUS_VARIANTS = {
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
    primaryActionLabel: 'In progress',
    primaryActionStatus: 'In Progress',
    showMap: true,
    showCardDetails: false,
    showFinalizeActions: false,
  },
  progress: {
    key: 'progress',
    statusLabel: 'In Progress',
    pillClass: 'progress',
    primaryActionLabel: 'Complete',
    primaryActionStatus: 'Completed',
    showMap: true,
    showCardDetails: true,
    showFinalizeActions: true,
  },
}

const STATUS_TABS = [
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
    return { google: null, apple: null, waze: null }
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
  const wazeBase = 'https://www.waze.com/ul'

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

  const waze =
    latitude != null && longitude != null
      ? `${wazeBase}?ll=${latitude},${longitude}&navigate=yes`
      : encodedQuery
      ? `${wazeBase}?q=${encodedQuery}&navigate=yes`
      : null

  return { google, apple, waze }
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

function resolveDisplayItems(order) {
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
        size: product.Size || product.size || product.variant || product.flavor || null,
        quantity,
        price: product.PriceB || product.price || product.Price || product.unitPrice || product.amount || null,
        image: product.image || product.Image || product.thumbnail || product.photo || null,
      }
    })
  }

  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item, index) => ({
      id: item.id ?? item.itemId ?? `${item.name ?? 'item'}-${index}`,
      name: item.name || item.Description || item.description || item.title || 'Item',
      size: item.Size || item.size || item.variant || null,
      quantity: item.quantity ?? item.qty ?? item.count ?? 1,
      price: item.price ?? item.amount ?? item.total ?? null,
      image: item.image || item.thumbnail || item.photo || null,
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

export default function OrderDetails() {
  const { status: routeStatusKey, orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()

  const initialOrder = location.state?.order ?? null

  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(!initialOrder)
  const [error, setError] = useState(null)
  const [cardDetails, setCardDetails] = useState(null)
  const [cardError, setCardError] = useState(null)
  const [cardLoading, setCardLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState(null)
  const [imageStatus, setImageStatus] = useState([])

  const resolvedStatusKey = useMemo(() => {
    const normalized = routeStatusKey?.toLowerCase()
    if (normalized && STATUS_VARIANTS[normalized]) {
      return normalized
    }

    return inferStatusKey(order?.status)
  }, [routeStatusKey, order?.status])

  const variant = STATUS_VARIANTS[resolvedStatusKey] ?? STATUS_VARIANTS.assigned
  const isAcceptedVariant = variant.key === 'accepted'
  const isProgressVariant = variant.key === 'progress'
  const requiresCardDetails = variant.showCardDetails

  const displayItems = useMemo(() => resolveDisplayItems(order), [order])

  useEffect(() => {
    let ignore = false

    async function loadOrderDetails() {
      if (!token || !orderId) {
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
  }, [token, orderId, initialOrder])

  useEffect(() => {
    setImageStatus(Array.from({ length: displayItems.length }, () => true))
  }, [displayItems])

  useEffect(() => {
    let ignore = false

    async function loadCardDetails() {
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
  }, [order, token, requiresCardDetails, variant.showCardDetails])

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleTabSelect = useCallback(
    (tabKey) => {
      if (!tabKey) {
        return
      }

      navigate('/orders', { state: { focus: tabKey } })
    },
    [navigate],
  )

  const canCompleteDelivery = useMemo(
    () => verificationChecks.id && verificationChecks.payment && verificationChecks.signature,
    [verificationChecks],
  )

  const handlePrimaryAction = useCallback(async () => {
    if (!order || !variant.primaryActionStatus || !token) {
      return
    }

    if (isProgressVariant && !canCompleteDelivery) {
      setInfoMessage({ type: 'error', text: 'Complete all delivery requirements before finishing.' })
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
  }, [canCompleteDelivery, isProgressVariant, navigate, order, token, variant.primaryActionStatus])

  const handleCancelOrder = useCallback(async () => {
    if (!order || !token) {
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
  }, [navigate, order, token])

  const navigateToBypass = useCallback(() => {
    if (!order) {
      return
    }

    navigate(`/orders/${resolvedStatusKey}/${order._id}/bypass`, {
      state: { order },
    })
  }, [navigate, order, resolvedStatusKey])

  const navigateToCamera = useCallback(() => {
    if (!order) {
      return
    }

    navigate(`/orders/${resolvedStatusKey}/${order._id}/camera`, {
      state: { order },
    })
  }, [navigate, order, resolvedStatusKey])

  const navigateToCancel = useCallback(() => {
    if (!order) {
      return
    }

    navigate(`/orders/${resolvedStatusKey}/${order._id}/cancel`, {
      state: { order, reason: 'No answer at door' },
    })
  }, [navigate, order, resolvedStatusKey])

  const toggleVerificationCheck = useCallback((key) => {
    if (!key) {
      return
    }

    setInfoMessage(null)
    setVerificationChecks((previous) => ({
      ...previous,
      [key]: !previous[key],
    }))
  }, [setInfoMessage])

  const prepareSignatureCanvas = useCallback(() => {
    const canvas = signatureCanvasRef.current
    if (!canvas) {
      return
    }

    const parent = canvas.parentElement
    const width = parent ? parent.clientWidth : 600
    const height = 220

    canvas.width = width
    canvas.height = height
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1f2937'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }, [])

  useEffect(() => {
    if (!isProgressVariant) {
      return
    }

    prepareSignatureCanvas()
    window.addEventListener('resize', prepareSignatureCanvas)

    return () => {
      window.removeEventListener('resize', prepareSignatureCanvas)
    }
  }, [isProgressVariant, prepareSignatureCanvas])

  useEffect(() => {
    setVerificationChecks({ id: false, payment: false, signature: false })
    setHasSignature(false)
  }, [resolvedStatusKey])

  const getSignatureCoordinates = useCallback((event) => {
    const canvas = signatureCanvasRef.current
    if (!canvas) {
      return { x: 0, y: 0 }
    }

    const rect = canvas.getBoundingClientRect()
    const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0
    const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? 0

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const handleSignaturePointerDown = useCallback(
    (event) => {
      event.preventDefault()
      const canvas = signatureCanvasRef.current
      if (!canvas) {
        return
      }

      const ctx = canvas.getContext('2d')
      const { x, y } = getSignatureCoordinates(event)
      ctx.beginPath()
      ctx.moveTo(x, y)
      setIsDrawingSignature(true)
    },
    [getSignatureCoordinates],
  )

  const handleSignaturePointerMove = useCallback(
    (event) => {
      if (!isDrawingSignature) {
        return
      }

      event.preventDefault()
      const canvas = signatureCanvasRef.current
      if (!canvas) {
        return
      }

      const ctx = canvas.getContext('2d')
      const { x, y } = getSignatureCoordinates(event)
      ctx.lineTo(x, y)
      ctx.stroke()
      setHasSignature(true)
      setVerificationChecks((previous) => ({ ...previous, signature: true }))
      setInfoMessage(null)
    },
    [getSignatureCoordinates, isDrawingSignature, setInfoMessage],
  )

  const handleSignaturePointerUp = useCallback(
    (event) => {
      if (!isDrawingSignature) {
        return
      }

      event.preventDefault()
      const canvas = signatureCanvasRef.current
      if (!canvas) {
        return
      }

      const ctx = canvas.getContext('2d')
      ctx.closePath()
      setIsDrawingSignature(false)
    },
    [isDrawingSignature],
  )

  const handleSignatureClear = useCallback(() => {
    prepareSignatureCanvas()
    setHasSignature(false)
    setVerificationChecks((previous) => ({ ...previous, signature: false }))
  }, [prepareSignatureCanvas])

  const handleBackToProgress = useCallback(() => {
    navigate('/orders', { state: { focus: 'progress' } })
  }, [navigate])

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

  const overlayLabel = 'Updating order…'
  const mapUrl = variant.showMap ? buildMapUrl(order.address) : null
  const { google: googleMapsUrl, apple: appleMapsUrl, waze: wazeMapsUrl } = buildMapLinks(order.address)
  const contactName = formatName(order.owner)
  const orderTimestamp = resolveOrderTimestamp(order)
  const timeSinceOrder = formatElapsedTime(orderTimestamp)

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
  const orderTotalAmount = resolveOrderTotal(order, displayItems)
  const orderTotalDisplay = formatCurrencyValue(orderTotalAmount)

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
  const {
    google: googleMapsUrl,
    apple: appleMapsUrl,
    waze: wazeMapsUrl,
  } = buildMapLinks(order.address)
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

  const detailEntries = []

  if (!isProgressVariant) {
    detailEntries.push({
      key: 'customer',
      content: (
        <span>
          <strong>Customer:</strong> {contactName}
        </span>
      ),
    })
  }

      <div className="order-detail-header">
        <div className="order-detail-header-top">
          <h1 className="order-detail-title">{contactName}</h1>
          <span className="order-detail-order">Order {formatOrderNumber(order)}</span>
        </div>
        <div className="order-detail-meta">
          {variant.statusLabel ? (
            <span className={`order-status-pill ${variant.pillClass}`}>{variant.statusLabel}</span>
          ) : null}
          <span className="order-detail-address">{formatAddress(order.address)}</span>
          {timeSinceOrder ? (
            <span className="order-detail-timer">Time since order: {timeSinceOrder}</span>
          ) : null}
        </div>
      </div>

  if (order.owner?.orderCount != null) {
    detailEntries.push({
      key: 'orders-count',
      content: (
        <span>
          <strong>Orders Count:</strong> {order.owner.orderCount}{' '}
          {order.owner.orderCount === 1 ? <span className="order-badge">New Customer</span> : null}
        </span>
      ),
    })
  }

  if (order.owner?.email) {
    detailEntries.push({
      key: 'email',
      content: (
        <span>
          <strong>Email:</strong> {order.owner.email}
        </span>
      ),
    })
  }

  if (order.owner?.dob) {
    detailEntries.push({
      key: 'dob',
      content: (
        <span>
          <strong>DOB:</strong> {formatDate(order.owner.dob)}
        </span>
      ),
    })
  }

      <section className="order-section-card" aria-label="Order summary">
        <div className="section-heading">
          <h2>Order Summary</h2>
          {orderTotalDisplay ? <span className="section-total">Total {orderTotalDisplay}</span> : null}
        </div>
        {displayItems.length > 0 ? (
          <div className="product-list">
            {displayItems.map((item, index) => (
              <div className="product-row" key={item.id}>
                <div className="product-thumb">
                  <img
                    src={imageStatus[index] && item.image ? item.image : fallbackImage}
                    alt={item.name}
                    onError={() => handleImageError(index)}
                  />
                </div>
                <div className="product-info">
                  <span className="product-quantity">{item.quantity ?? 0}×</span>
                  <p className="product-name">
                    {item.name}
                    {item.size ? ` · ${item.size}` : ''}
                  </p>
                  {item.price ? (
                    <p className="product-price">{formatCurrencyValue(item.price)} ea</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="detail-note">No items listed.</p>
        )}
      </section>

      <section className="order-section-card" aria-label="Delivery notes">
        <h2 className="section-title">Delivery Notes / Apartment #</h2>
        <p className="detail-note">{order.deliveryNote || 'N/A'}</p>
      </section>

      <section className="order-section-card" aria-label="Delivery details">
        <h2 className="section-title">Delivery Details</h2>
        <div className="detail-grid">
          <span>
            <strong>Customer:</strong> {contactName}
          </span>
        ),
      })
    }

    if (recipientPhone) {
      detailEntries.push({
        key: 'recipient-phone',
        content: (
          <span>
            <strong>Recipient Phone:</strong>{' '}
            <a href={normalizePhoneHref(recipientPhone)} rel="noreferrer">
              {formatPhoneNumber(recipientPhone) || recipientPhone}
            </a>
          </span>
        ),
      })
    }

    if (recipientBusinessName) {
      detailEntries.push({
        key: 'recipient-business',
        content: (
          <span>
            <strong>Recipient Business:</strong> {recipientBusinessName}
          </span>
          {orderTotalDisplay ? (
            <span>
              <strong>Order Total:</strong> {orderTotalDisplay}
            </span>
          ) : null}
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
              <a href={phoneHref || undefined} rel="noreferrer">
                {formattedPhone || rawPhone}
              </a>
            </span>
          ) : null}
          <span>
            <strong>Sender Name:</strong> {senderName}
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
                  <a
                    href={normalizePhoneHref(order.giftDeliveryDetails.recipientPhone) || undefined}
                    rel="noreferrer"
                  >
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
                  <a
                    href={normalizePhoneHref(order.giftDeliveryDetails.senderPhone) || undefined}
                    rel="noreferrer"
                  >
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
          <div className="detail-grid card-detail-grid">
            <span>
              <strong>Last 4:</strong> **** **** **** {cardDetails.last4 || '—'}{' '}
              {order.fromWallet ? (
                <span className="badge wallet">{order.walletMethod}</span>
              ) : null}
            </div>
            {orderTotalDisplay ? (
              <div className="order-compact-card">
                <span className="order-compact-label">Total</span>
                <span className="order-compact-value">{orderTotalDisplay}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {cardLoading ? <p className="order-card-meta">Loading payment details…</p> : null}

        {(googleMapsUrl || appleMapsUrl || wazeMapsUrl || addressLines.length > 0) && (
          <div className="map-link-grid">
            <div className="map-address">
              {addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
            <div className="map-links">
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
              {wazeMapsUrl ? (
                <a href={wazeMapsUrl} target="_blank" rel="noreferrer">
                  Waze
                </a>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {variant.showFinalizeActions ? (
        <section className="order-section-card" aria-label="Finalize actions">
          <h2 className="section-title">Finalize</h2>
          <div className="action-grid">
            <button type="button" className="action-button" onClick={navigateToBypass}>
              Bypass
            </button>
            <button type="button" className="action-button" onClick={navigateToCamera}>
              Verify Info
            </button>
            <button type="button" className="action-button" onClick={navigateToCancel}>
              No Answer
            </button>
            <button type="button" className="action-button destructive" onClick={handleCancelOrder}>
              Cancel Order
            </button>
          </div>
        ) : (
          <>
            <div className={`order-contact ${isAcceptedVariant ? 'accepted' : ''}`}>
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

            <section
              className={`order-section ${isAcceptedVariant ? 'accepted' : ''} ${
                isProgressVariant ? 'progress' : ''
              }`}
              aria-label="Delivery address"
            >
              <h2 className="order-section-title">Delivery Address</h2>
              <address className="order-address">
                {addressLines.map((line, index) => (
                  <span key={`${line}-${index}`}>{line}</span>
                ))}
              </address>
              {googleMapsUrl || appleMapsUrl || wazeMapsUrl ? (
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
                  {wazeMapsUrl ? (
                    <a href={wazeMapsUrl} target="_blank" rel="noreferrer">
                      Waze
                    </a>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section
              className={`order-section ${isAcceptedVariant ? 'accepted' : ''} ${
                isProgressVariant ? 'progress' : ''
              }`}
              aria-label="Order items"
            >
              <h2 className="order-section-title">Order Items</h2>
              <ul className="order-items-list">
                {items.length > 0 ? (
                  items.map((item) => (
                    <li
                      key={item.id}
                      className={`order-item-row ${isAcceptedVariant ? 'accepted' : ''}`}
                    >
                      <span className="order-item-name">{item.name}</span>
                      <span className="order-item-quantity">{item.quantity}x</span>
                    </li>
                  ))
                ) : (
                  <li className="order-item-row order-item-row-empty">No items listed.</li>
                )}
              </ul>
            </section>

            <footer
              className={`order-ticket-footer ${isAcceptedVariant ? 'accepted' : ''} ${
                isProgressVariant ? 'progress' : ''
              }`}
            >
              <div className={`order-total ${isAcceptedVariant ? 'accepted' : ''}`}>
                <span className="order-total-label">Order Total</span>
                <span className="order-total-value">{orderTotalDisplay ?? '—'}</span>
              </div>
              {primaryButtonLabel ? (
                <button
                  type="button"
                  className={`order-action-button ${
                    isAcceptedVariant ? 'accepted-primary' : ''
                  }`}
                  onClick={handlePrimaryAction}
                  disabled={actionLoading}
                >
                  {primaryButtonLabel}
                  {!isAcceptedVariant ? (
                    <span className="order-action-arrow" aria-hidden="true">→</span>
                  ) : null}
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

      {variant.primaryActionLabel ? (
        <div className="order-footer">
          <button
            type="button"
            className="order-primary-action"
            onClick={handlePrimaryAction}
            disabled={actionLoading}
          >
            {variant.primaryActionLabel}
          </button>
          <p className="order-secondary-text">{contactName}</p>
        </div>
      ) : null}
    </div>
  )
}

