import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LoaderOverlay from '../../components/LoaderOverlay'
import { useAuth } from '../../context/AuthContext'
import fallbackImage from '../../assets/placeholder-product.svg'
import { fetchCardDetails, fetchOrderById, updateOrder, updateOrderStatus } from '../../services/orderService'
import './Orders.css'

const STATUS_VARIANTS = {
  assigned: {
    key: 'assigned',
    statusLabel: 'Assigned',
    pillClass: 'assigned',
    primaryActionLabel: 'Tap to Accept',
    primaryActionStatus: 'Accepted',
    showMap: false,
    showCardDetails: false,
    showFinalizeActions: false,
  },
  accepted: {
    key: 'accepted',
    statusLabel: 'Accepted',
    pillClass: 'accepted',
    primaryActionLabel: 'Tap to Start Delivery',
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
  const [imageStatus, setImageStatus] = useState(() => initialOrder?.products?.map(() => true) ?? [])

  const resolvedStatusKey = useMemo(() => {
    const normalized = routeStatusKey?.toLowerCase()
    if (normalized && STATUS_VARIANTS[normalized]) {
      return normalized
    }

    return inferStatusKey(order?.status)
  }, [routeStatusKey, order?.status])

  const variant = STATUS_VARIANTS[resolvedStatusKey] ?? STATUS_VARIANTS.assigned
  const requiresCardDetails = variant.showCardDetails

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
    const count = order?.products?.length ?? 0
    setImageStatus(Array.from({ length: count }, () => true))
  }, [order?.products])

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

  const handleImageError = useCallback((index) => {
    setImageStatus((prev) => {
      if (!prev || prev.length === 0) {
        return prev
      }

      const next = [...prev]
      next[index] = false
      return next
    })
  }, [])

  const handlePrimaryAction = useCallback(async () => {
    if (!order || !variant.primaryActionStatus || !token) {
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
  }, [navigate, order, token, variant.primaryActionStatus])

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

  const mapUrl = variant.showMap ? buildMapUrl(order.address) : null
  const overlayLabel = 'Updating order…'

  return (
    <div className="order-detail-screen">
      <LoaderOverlay show={actionLoading} label={overlayLabel} />

      <div className="order-detail-header">
        <h1 className="order-detail-title">{formatName(order.owner)}</h1>
        <div className="order-detail-meta">
          <span className={`status-pill ${variant.pillClass}`}>{variant.statusLabel}</span>
          <span>{formatAddress(order.address)}</span>
        </div>
      </div>

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

      {mapUrl ? (
        <div className="map-preview">
          <img src={mapUrl} alt="Delivery location map" loading="lazy" />
        </div>
      ) : null}

      <section className="order-section-card">
        <h2 className="section-heading">Order Summary</h2>
        <div className="product-list">
          {order.products?.map((product, index) => (
            <div className="product-row" key={product._id ?? index}>
              <div className="product-thumb">
                <img
                  src={imageStatus[index] && product.image ? product.image : fallbackImage}
                  alt={product.Description || 'Product'}
                  onError={() => handleImageError(index)}
                />
              </div>
              <div className="product-info">
                <span className="product-quantity">{order.qty?.[index] ?? 0}×</span>
                <p className="product-name">
                  {product.Description} {product.Size ? `- ${product.Size}` : ''}
                </p>
                {product.PriceB ? (
                  <p className="product-price">${product.PriceB} ea</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="order-section-card">
        <h2 className="section-heading">Delivery Notes / Apartment #</h2>
        <p className="detail-note">{order.deliveryNote || 'N/A'}</p>
      </section>

      <section className="order-section-card">
        <h2 className="section-heading">Delivery Details</h2>
        <div className="detail-grid">
          <span>
            <strong>Customer:</strong> {formatName(order.owner)}
          </span>
          <span>
            <strong>Orders Count:</strong> {order.owner?.orderCount ?? 0}{' '}
            {order.owner?.orderCount === 1 ? <span className="badge">New Customer</span> : null}
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
          {order.owner?.phone ? (
            <span>
              <strong>Phone:</strong>{' '}
              <a href={`tel:${order.owner.phone}`} rel="noreferrer">
                {order.owner.phone}
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
                  <a href={`tel:${order.giftDeliveryDetails.recipientPhone}`} rel="noreferrer">
                    {order.giftDeliveryDetails.recipientPhone}
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
                  <a href={`tel:${order.giftDeliveryDetails.senderPhone}`} rel="noreferrer">
                    {order.giftDeliveryDetails.senderPhone}
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
          <div className="detail-grid" style={{ marginTop: '0.75rem' }}>
            <span>
              <strong>Last 4:</strong> **** **** **** {cardDetails.last4 || '—'}{' '}
              {order.fromWallet ? (
                <span className="badge" style={{ background: '#2563eb' }}>
                  {order.walletMethod}
                </span>
              ) : null}
            </span>
            <span>
              <strong>Expiration:</strong> {cardDetails.exp_month}/{cardDetails.exp_year}
            </span>
          </div>
        ) : null}
        {cardLoading ? <p className="order-card-meta">Loading payment details…</p> : null}
      </section>

      {variant.showFinalizeActions ? (
        <section className="order-section-card">
          <h2 className="section-heading">Finalize</h2>
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
        </section>
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
          <p className="order-secondary-text">{formatName(order.owner)}</p>
        </div>
      ) : null}
    </div>
  )
}
