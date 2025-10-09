import { useEffect, useMemo, useState } from 'react'
import { formatCurrency, getInitials } from '../../utils/format.ts'
import TimerChip from '../../components/TimerChip.jsx'
import VerifyChecklist from '../../components/VerifyChecklist.jsx'
import SignaturePad from '../../components/SignaturePad.jsx'

export default function OrderDetail({ order, onArrive, onComplete }) {
  const [idChecked, setIdChecked] = useState(false)
  const [paymentChecked, setPaymentChecked] = useState(false)
  const [signature, setSignature] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const stage = order.status ?? 'assigned'

  useEffect(() => {
    setIdChecked(false)
    setPaymentChecked(false)
    setSignature(null)
    setSubmitting(false)
  }, [order.id, stage])

  const canComplete = idChecked && paymentChecked && Boolean(signature)
  const showVerification = stage === 'out-for-delivery'
  const showArriveButton = stage === 'accepted'

  const mapsQuery = useMemo(() => encodeURIComponent(order.customer.address), [order.customer.address])

  async function handleArrive() {
    setSubmitting(true)
    try {
      await onArrive(order.id)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComplete() {
    if (!signature) return
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
      {showArriveButton ? (
        <button type="button" className="action-btn primary" onClick={handleArrive} disabled={submitting}>
          I&apos;ve Arrived at Customer Location →
        </button>
      ) : null}
      {showVerification ? (
        <div className="verification-stack">
          <VerifyChecklist
            idChecked={idChecked}
            paymentChecked={paymentChecked}
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
            disabled={!canComplete || submitting}
          >
            Complete Delivery
          </button>
        </div>
      ) : stage === 'completed' ? (
        <div className="completion-banner">Delivery completed · Signature on file.</div>
      ) : null}
    </section>
  )
}
