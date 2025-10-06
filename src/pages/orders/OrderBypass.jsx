import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LoaderOverlay from '../../components/LoaderOverlay'
import { useAuth } from '../../context/AuthContext'
import fallbackImage from '../../assets/placeholder-product.svg'
import { fetchOrderById, updateOrder, uploadImage } from '../../services/orderService'
import './Orders.css'

function formatName(owner) {
  if (!owner) {
    return 'Customer'
  }

  return [owner?.name?.first, owner?.name?.last].filter(Boolean).join(' ') || 'Customer'
}

function totalQuantity(order) {
  if (!order?.qty || !Array.isArray(order.qty)) {
    return 0
  }

  return order.qty.reduce((sum, value) => sum + (Number(value) || 0), 0)
}

export default function OrderBypass() {
  const { status = 'progress', orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()

  const locationState = useMemo(() => location.state ?? {}, [location.state])
  const initialOrder = locationState.order ?? null
  const signatureData = locationState.signatureData ?? null
  const idPicture = locationState.idPicture ?? null

  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(!initialOrder)
  const [error, setError] = useState(null)
  const [infoMessage, setInfoMessage] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [imageStatus, setImageStatus] = useState(() => initialOrder?.products?.map(() => true) ?? [])

  useEffect(() => {
    let ignore = false

    async function loadOrder() {
      if (!token || !orderId || initialOrder) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await fetchOrderById(orderId, token)
        if (!ignore) {
          setOrder(data)
          setImageStatus(data?.products?.map(() => true) ?? [])
        }
      } catch (err) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : 'Unable to load order.'
          setError(message)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadOrder()

    return () => {
      ignore = true
    }
  }, [initialOrder, orderId, token])

  useEffect(() => {
    setImageStatus(order?.products?.map(() => true) ?? [])
  }, [order?.products])

  const handleImageError = useCallback((index) => {
    setImageStatus((prev) => {
      if (!prev?.length) {
        return prev
      }

      const next = [...prev]
      next[index] = false
      return next
    })
  }, [])

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const navigateToSignature = useCallback(() => {
    if (!order) {
      return
    }

    navigate(`/orders/${status}/${orderId}/signature`, {
      state: {
        order,
        idPicture,
        from: 'bypass',
      },
    })
  }, [idPicture, navigate, order, orderId, status])

  const navigateToCamera = useCallback(() => {
    if (!order) {
      return
    }

    navigate(`/orders/${status}/${orderId}/camera`, {
      state: {
        order,
        signatureData,
        idPicture,
        from: 'bypass',
      },
    })
  }, [idPicture, navigate, order, orderId, signatureData, status])

  const handleComplete = useCallback(async () => {
    if (!order) {
      return
    }

    if (!signatureData) {
      setInfoMessage({ type: 'error', text: 'A signature is required to complete the order.' })
      return
    }

    if (!token) {
      setInfoMessage({ type: 'error', text: 'Authentication required to update the order.' })
      return
    }

    setActionLoading(true)
    setInfoMessage(null)

    try {
      const signatureUrl = await uploadImage(signatureData)

      const updates = {
        _id: order._id,
        status: 'Completed',
        signature: signatureUrl,
      }

      if (idPicture) {
        updates.idPicture = idPicture
      }

      await updateOrder(updates, token)

      navigate('/orders', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete order.'
      setInfoMessage({ type: 'error', text: message })
    } finally {
      setActionLoading(false)
    }
  }, [idPicture, navigate, order, signatureData, token])

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

  const totalItems = totalQuantity(order)

  return (
    <div className="finalize-screen">
      <LoaderOverlay show={actionLoading} label="Finalizing order…" />

      <header className="finalize-header">
        <div>
          <button type="button" className="link-button" onClick={handleBack}>
            Back
          </button>
        </div>
        <h1>Bypass Verification</h1>
        <p className="order-card-meta">
          Review order details before completing delivery for {formatName(order.owner)}.
        </p>
      </header>

      {infoMessage ? (
        <p className={`notice ${infoMessage.type}`} role="status">
          {infoMessage.text}
        </p>
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
        <div className="order-totals">
          <span className="order-total-label">Total</span>
          <span className="order-total-items">{totalItems} items</span>
          <span className="order-total-amount">${order.total ?? 0}</span>
        </div>
      </section>

      <section className="finalize-card">
        <h2 className="section-heading">Verification Assets</h2>
        <div className="verification-assets">
          <div className="verification-item">
            <h3>Signature</h3>
            {signatureData ? (
              <img src={signatureData} alt="Customer signature" />
            ) : (
              <p className="order-card-meta">No signature captured yet.</p>
            )}
            <button type="button" className="action-button" onClick={navigateToSignature}>
              {signatureData ? 'Retake Signature' : 'Capture Signature'}
            </button>
          </div>
          <div className="verification-item">
            <h3>Photo ID</h3>
            {idPicture ? (
              <img src={idPicture} alt="Customer identification" />
            ) : (
              <p className="order-card-meta">No ID uploaded yet.</p>
            )}
            <button type="button" className="action-button" onClick={navigateToCamera}>
              {idPicture ? 'Replace Photo ID' : 'Upload Photo ID'}
            </button>
          </div>
        </div>
      </section>

      <div className="finalize-actions">
        <button type="button" className="action-button primary" onClick={handleComplete}>
          Complete Order
        </button>
      </div>
    </div>
  )
}
