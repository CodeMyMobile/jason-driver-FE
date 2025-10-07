import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useOrder, useOrderActions } from '../../../hooks/useOrders'
import { TimerChip } from '../../../components/TimerChip'
import { SignaturePad, type SignaturePadHandle } from '../../../components/SignaturePad'
import { VerifyChecklist } from '../../../components/VerifyChecklist'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function buildMapUrl(address: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`
}

function buildWazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}`
}

export default function OrderDetailPage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const { data: order, status, refetch } = useOrder(orderId)
  const actions = useOrderActions(orderId)
  const signatureRef = useRef<SignaturePadHandle | null>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [verifications, setVerifications] = useState({ id: false, payment: false })
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    setError(null)
    setVerifications({ id: false, payment: false })
    signatureRef.current?.clear()
    setHasSignature(false)
  }, [order?.status])

  const isLoaded = status === 'success' && order

  const showArrive = order?.status === 'IN_PROGRESS'
  const showStart = order?.status === 'ASSIGNED'
  const showAccept = order?.status === 'NEW'
  const showVerification = order?.status === 'ARRIVED'
  const showComplete = order?.status === 'ARRIVED'

  const canComplete = useMemo(() => {
    if (!showComplete) return false
    if (!signatureRef.current) return false
    return verifications.id && verifications.payment && hasSignature
  }, [verifications.id, verifications.payment, showComplete, hasSignature])

  if (status === 'loading') {
    return (
      <div className="list-placeholder" role="status" aria-live="polite">
        Loading order…
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="list-placeholder">
        Order not found.
        <button type="button" className="secondary-link" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    )
  }

  const toggleVerification = (key: 'id' | 'payment') => {
    setVerifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAccept = async () => {
    await actions.accept.mutateAsync()
    void refetch()
  }

  const handleStart = async () => {
    await actions.start.mutateAsync()
    void refetch()
  }

  const handleArrive = async () => {
    await actions.arrive.mutateAsync()
    void refetch()
  }

  const handleComplete = async () => {
    if (!hasSignature) {
      setError('Please capture customer signature before completing delivery.')
      return
    }
    if (!verifications.id || !verifications.payment) {
      setError('Verify ID and payment before completing delivery.')
      return
    }
    setError(null)
    const signatureUrl = signatureRef.current.toDataURL()
    await actions.complete.mutateAsync({ signatureUrl, notes: notes || undefined })
    navigate('/orders?tab=completed', { replace: true })
  }

  return (
    <article className="order-detail">
      <header className="order-header">
        <div>
          <span className="order-number">Order #{order.id}</span>
          <p className="order-status">Status: {order.status}</p>
        </div>
        <div className="order-timer">
          <TimerChip createdAt={order.createdAt} />
          <span className="timer-label">Time Since Order</span>
        </div>
      </header>
      <section className="customer-info">
        <div className="customer-avatar">{getInitials(order.customer.name)}</div>
        <div className="customer-details">
          <h3>{order.customer.name}</h3>
          {order.customer.phone ? (
            <a className="customer-phone" href={`tel:${order.customer.phone}`}>
              📱 {order.customer.phone}
            </a>
          ) : null}
        </div>
      </section>
      <section className="address-section">
        <div className="address-icon" aria-hidden="true">
          📍
        </div>
        <div className="address-text">
          <h4>Delivery Address</h4>
          <p>{order.customer.address}</p>
          <div className="address-links">
            <a href={buildMapUrl(order.customer.address)} target="_blank" rel="noreferrer">
              Google Maps
            </a>
            <a href={buildWazeUrl(order.customer.address)} target="_blank" rel="noreferrer">
              Waze
            </a>
          </div>
        </div>
      </section>
      <div className="order-total">
        <span>Order Total</span>
        <span>${order.total.toFixed(2)}</span>
      </div>
      {showAccept ? (
        <button type="button" className="action-btn accept-btn" onClick={handleAccept}>
          Accept Order →
        </button>
      ) : null}
      {showStart ? (
        <button type="button" className="action-btn" onClick={handleStart}>
          Start Delivery →
        </button>
      ) : null}
      {showArrive ? (
        <button type="button" className="action-btn" onClick={handleArrive}>
          I&apos;ve Arrived at Customer Location →
        </button>
      ) : null}
      {showVerification ? (
        <div className="verification-block">
          <VerifyChecklist
            items={[
              { key: 'id', label: 'ID Verified (21+ years)', checked: verifications.id },
              { key: 'payment', label: 'Payment Method Verified', checked: verifications.payment },
            ]}
            onToggle={(key) => toggleVerification(key as 'id' | 'payment')}
          />
          <div className="verify-section">
            <h3>Customer Signature</h3>
            <SignaturePad
              ref={signatureRef}
              onChange={(signed) => {
                setHasSignature(signed)
                if (signed) setError(null)
              }}
            />
            <button
              type="button"
              className="clear-button"
              onClick={() => {
                signatureRef.current?.clear()
                setHasSignature(false)
              }}
            >
              Clear
            </button>
          </div>
          <label className="notes-label" htmlFor="delivery-notes">
            Delivery Notes (optional)
          </label>
          <textarea
            id="delivery-notes"
            className="notes-input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add any delivery notes…"
          />
          <button
            type="button"
            className="action-btn complete-btn"
            onClick={handleComplete}
            disabled={!canComplete}
          >
            Complete Delivery
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      ) : null}
    </article>
  )
}
