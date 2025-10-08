import { useEffect, useMemo, useState } from 'react'
import { Order } from '../../../../types'
import { formatCurrency, getInitials } from '../../../../utils/format'
import { TimerChip } from '../../../../components/TimerChip'
import { VerifyChecklist } from '../../../../components/VerifyChecklist'
import { SignaturePad } from '../../../../components/SignaturePad'

interface ActiveOrderDetailProps {
  order: Order
  onArrive: (orderId: string) => Promise<void>
  onComplete: (orderId: string, signature: string) => Promise<void>
}

export function ActiveOrderDetail({ order, onArrive, onComplete }: ActiveOrderDetailProps): JSX.Element {
  const [idChecked, setIdChecked] = useState(false)
  const [paymentChecked, setPaymentChecked] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setIdChecked(false)
    setPaymentChecked(false)
    setSignature(null)
    setSubmitting(false)
  }, [order.id, order.status])

  const canComplete = idChecked && paymentChecked && Boolean(signature)
  const showVerification = order.status === 'ARRIVED'
  const showArriveButton = order.status === 'IN_PROGRESS'
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
    <section className="driver-active-order">
      <header className="driver-active-order__header">
        <span className="driver-active-order__number">Order #{order.number}</span>
        <TimerChip order={order} />
      </header>
      <div className="driver-active-order__customer">
        <div className="driver-active-order__avatar">{getInitials(order.customer.name)}</div>
        <div className="driver-active-order__customer-details">
          <h3>{order.customer.name}</h3>
          <a href={`tel:${order.customer.phone}`} className="driver-active-order__phone">
            📱 {order.customer.phone}
          </a>
        </div>
      </div>
      <div className="driver-active-order__address">
        <div className="driver-active-order__address-icon" aria-hidden>
          📍
        </div>
        <div>
          <h4>Delivery Address</h4>
          <p>{order.customer.address}</p>
          <div className="driver-active-order__address-links">
            <a href={`https://maps.google.com/?q=${mapsQuery}`} target="_blank" rel="noopener noreferrer">
              Google Maps
            </a>
            <a href={`https://waze.com/ul?q=${mapsQuery}`} target="_blank" rel="noopener noreferrer">
              Waze
            </a>
          </div>
        </div>
      </div>
      <div className="driver-active-order__total">
        <span>Order Total</span>
        <span>{formatCurrency(order.total)}</span>
      </div>
      {order.items.length > 0 ? (
        <section className="driver-active-order__items">
          <h4>Items in Order</h4>
          <ul>
            {order.items.map((item) => (
              <li key={item.id}>
                <span>{item.quantity}x</span>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {showArriveButton ? (
        <button
          type="button"
          className="driver-active-order__primary"
          onClick={handleArrive}
          disabled={submitting}
        >
          I&apos;ve Arrived at Customer Location →
        </button>
      ) : null}
      {showVerification ? (
        <div className="driver-active-order__verification">
          <VerifyChecklist
            idChecked={idChecked}
            paymentChecked={paymentChecked}
            onChange={({ idChecked: id, paymentChecked: payment }) => {
              setIdChecked(id)
              setPaymentChecked(payment)
            }}
          />
          <div className="driver-active-order__signature">
            <h3>Customer Signature</h3>
            <SignaturePad value={signature} onChange={setSignature} />
          </div>
          <button
            type="button"
            className="driver-active-order__primary"
            onClick={handleComplete}
            disabled={!canComplete || submitting}
          >
            Complete Delivery
          </button>
        </div>
      ) : order.status === 'COMPLETED' ? (
        <div className="driver-active-order__complete-banner">Delivery completed · Signature on file.</div>
      ) : null}
    </section>
  )
}
