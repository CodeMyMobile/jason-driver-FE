import { useEffect, useMemo, useState } from 'react'
import { Order } from '../../types'
import { formatCurrency, getInitials } from '../../utils/format'
import { TimerChip } from '../../components/TimerChip'
import { VerifyChecklist } from '../../components/VerifyChecklist'
import { SignaturePad } from '../../components/SignaturePad'

interface OrderDetailProps {
  order: Order
  onStart?: (orderId: string) => Promise<void>
  onArrive?: (orderId: string) => Promise<void>
  onComplete?: (orderId: string, signature: string) => Promise<void>
}

export function OrderDetail({ order, onStart, onArrive, onComplete }: OrderDetailProps): JSX.Element {
  const [idChecked, setIdChecked] = useState(false)
  const [paymentChecked, setPaymentChecked] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const idPrefilled = !order.requiresIdCheck
  const paymentPrefilled = !order.requiresPaymentCheck

  useEffect(() => {
    setIdChecked(idPrefilled)
    setPaymentChecked(paymentPrefilled)
    setSignature(null)
    setSubmitting(false)
  }, [idPrefilled, order.id, order.status, paymentPrefilled])

  const hasStarted = Boolean(order.startedAt) || order.status === 'IN_PROGRESS' || order.status === 'ARRIVED' || order.status === 'COMPLETED'
  const hasArrived = Boolean(order.arrivedAt) || order.status === 'ARRIVED' || order.status === 'COMPLETED'
  const isCompleted = Boolean(order.completedAt) || order.status === 'COMPLETED'
  const awaitingStart = Boolean(onStart) && !hasStarted && !isCompleted
  const awaitingArrival = Boolean(onArrive) && hasStarted && !hasArrived && !isCompleted
  const showVerification = (hasArrived || isCompleted) && Boolean(onComplete)

  const mapsQuery = useMemo(() => encodeURIComponent(order.customer.address), [order.customer.address])

  const idFulfilled = idChecked || !order.requiresIdCheck
  const paymentFulfilled = paymentChecked || !order.requiresPaymentCheck
  const canComplete = idFulfilled && paymentFulfilled && Boolean(signature) && !submitting

  async function handleStart() {
    if (!onStart) return
    setSubmitting(true)
    try {
      await onStart(order.id)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleArrive() {
    if (!onArrive) return
    setSubmitting(true)
    try {
      await onArrive(order.id)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComplete() {
    if (!onComplete || !signature) return
    setSubmitting(true)
    try {
      await onComplete(order.id, signature)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="order-detail">
      <div className="order-header">
        <span className="order-number">Order #{order.number}</span>
        <TimerChip order={order} />
      </div>
      <div className="customer-info">
        <div className="customer-avatar large">{getInitials(order.customer.name)}</div>
        <div className="customer-details">
          <h3>{order.customer.name}</h3>
          <p>
            <a href={`tel:${order.customer.phone}`} className="phone-link">
              📱 {order.customer.phone}
            </a>
          </p>
        </div>
      </div>
      <div className="address-section">
        <div className="address-icon">📍</div>
        <div className="address-text">
          <h4>Delivery Address</h4>
          <p>{order.customer.address}</p>
          <div className="address-links">
            <a href={`https://maps.google.com/?q=${mapsQuery}`} target="_blank" rel="noopener noreferrer">
              Google Maps
            </a>
            <a href={`https://waze.com/ul?q=${mapsQuery}`} target="_blank" rel="noopener noreferrer">
              Waze
            </a>
          </div>
        </div>
      </div>
      <div className="order-total">
        <span>Order Total</span>
        <span>{formatCurrency(order.total)}</span>
      </div>
      {order.items.length > 0 ? (
        <div className="items-section">
          <h4>Items in Order</h4>
          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.id} className="order-item">
                <span className="item-quantity">{item.quantity}x</span>
                <span className="item-name">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {awaitingStart ? (
        <button
          type="button"
          className="action-btn primary"
          onClick={handleStart}
          disabled={submitting}
        >
          Start Delivery →
        </button>
      ) : null}
      {awaitingArrival ? (
        <button
          type="button"
          className="action-btn primary"
          onClick={handleArrive}
          disabled={submitting}
        >
          I&apos;ve Arrived at Customer Location →
        </button>
      ) : null}
      {showVerification ? (
        <div className="verification-stack">
          {!isCompleted ? (
            <>
              <VerifyChecklist
                idChecked={idChecked}
                paymentChecked={paymentChecked}
                requiresIdCheck={order.requiresIdCheck}
                requiresPaymentCheck={order.requiresPaymentCheck}
                onChange={({ idChecked: id, paymentChecked: payment }) => {
                  setIdChecked(id)
                  setPaymentChecked(payment)
                }}
              />
              <div className="verify-section">
                <h3>Customer Signature</h3>
                <SignaturePad value={signature} onChange={setSignature} />
              </div>
              <button
                type="button"
                className="action-btn primary"
                onClick={handleComplete}
                disabled={!canComplete}
              >
                Complete Delivery
              </button>
            </>
          ) : (
            <div className="completion-banner">Delivery completed · Signature on file.</div>
          )}
        </div>
      ) : isCompleted ? (
        <div className="completion-banner">Delivery completed · Signature on file.</div>
      ) : null}
    </section>
  )
}
