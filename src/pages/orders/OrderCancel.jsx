import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LoaderOverlay from '../../components/LoaderOverlay'
import { useAuth } from '../../context/AuthContext'
import { fetchOrderById, updateOrder } from '../../services/orderService'
import './Orders.css'

export default function OrderCancel() {
  const { orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()

  const locationState = useMemo(() => location.state ?? {}, [location.state])
  const initialOrder = locationState.order ?? null
  const initialReason = locationState.reason ?? ''

  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(!initialOrder)
  const [error, setError] = useState(null)
  const [reason, setReason] = useState(initialReason)
  const [actionLoading, setActionLoading] = useState(false)
  const [infoMessage, setInfoMessage] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadOrder() {
      if (!token || !orderId || initialOrder) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetchOrderById(orderId, token)
        if (!ignore) {
          setOrder(result)
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

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()

      if (!order) {
        return
      }

      if (!reason.trim()) {
        setInfoMessage({ type: 'error', text: 'Please provide a reason before submitting.' })
        return
      }

      if (!token) {
        setInfoMessage({ type: 'error', text: 'Authentication required to update the order.' })
        return
      }

      setActionLoading(true)
      setInfoMessage(null)

      try {
        await updateOrder(
          {
            _id: order._id,
            status: 'Canceled',
            deliveryNote: reason.trim(),
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
    },
    [navigate, order, reason, token],
  )

  const handleBack = useCallback(() => {
    navigate(-1)
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

  return (
    <div className="finalize-screen">
      <LoaderOverlay show={actionLoading} label="Submitting reason…" />

      <header className="finalize-header">
        <div>
          <button type="button" className="link-button" onClick={handleBack}>
            Back
          </button>
        </div>
        <h1>No Answer</h1>
        <p className="order-card-meta">Provide context before canceling the order.</p>
      </header>

      {infoMessage ? (
        <p className={`notice ${infoMessage.type}`} role="status">
          {infoMessage.text}
        </p>
      ) : null}

      <form className="finalize-card" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="order-cancel-reason">
          Reason for cancellation
        </label>
        <textarea
          id="order-cancel-reason"
          rows={6}
          placeholder="Add notes about why the delivery could not be completed"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />

        <div className="finalize-actions">
          <button type="submit" className="action-button primary">
            Submit
          </button>
          <button type="button" className="action-button" onClick={handleBack}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
