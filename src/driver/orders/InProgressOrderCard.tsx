import { useEffect, useMemo, useState } from 'react'
import { SignaturePad } from '../components/SignaturePad'
import { DriverOrder } from '../types'
import type { CompleteOrderPayload } from '../../api/orders'
import { LocationLinks } from './LocationLinks'

interface InProgressOrderCardProps {
  order: DriverOrder
  onStart: (orderId: string) => Promise<void>
  onArrive: (orderId: string) => Promise<void>
  onComplete: (orderId: string, payload: CompleteOrderPayload) => Promise<void>
}

function formatRelativeTime(from: string | undefined): string {
  if (!from) return '—'
  const date = new Date(from)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  if (minutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''} ago`
  }
  return `${hours}h ${minutes}m ago`
}

export function InProgressOrderCard({ order, onStart, onArrive, onComplete }: InProgressOrderCardProps): JSX.Element {
  const [idVerified, setIdVerified] = useState(false)
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<'start' | 'arrive' | 'complete' | null>(null)

  const hasStarted = Boolean(order.startedAt) || order.status === 'IN_PROGRESS' || order.status === 'ARRIVED'
  const hasArrived = Boolean(order.arrivedAt) || order.status === 'ARRIVED'
  const showVerification = hasArrived
  const canComplete = showVerification && idVerified && paymentVerified && Boolean(signature)

  useEffect(() => {
    setError(null)
    if (!hasArrived) {
      setIdVerified(false)
      setPaymentVerified(false)
      setSignature(null)
      setNotes('')
    }
  }, [order.id, hasArrived])

  const handleStart = async () => {
    setError(null)
    setAction('start')
    try {
      await onStart(order.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start delivery. Please try again.')
    } finally {
      setAction(null)
    }
  }

  const handleArrive = async () => {
    setError(null)
    setAction('arrive')
    try {
      await onArrive(order.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log arrival. Please try again.')
    } finally {
      setAction(null)
    }
  }

  const handleComplete = async () => {
    if (!signature) {
      setError('A customer signature is required to complete delivery.')
      return
    }
    setError(null)
    setAction('complete')
    try {
      const payload: CompleteOrderPayload = {
        proof: { signatureUrl: signature },
        notes: notes.trim() ? notes.trim() : undefined,
      }
      await onComplete(order.id, payload)
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete delivery. Please try again.')
    } finally {
      setAction(null)
    }
  }

  const timeline = useMemo(
    () => [
      { label: 'Accepted', timestamp: order.acceptedAt },
      { label: 'Started', timestamp: order.startedAt },
      { label: 'Arrived', timestamp: order.arrivedAt },
    ],
    [order.acceptedAt, order.arrivedAt, order.startedAt],
  )

  return (
    <article className="inprogress-card" aria-label={`In-progress order ${order.number}`}>
      <header className="inprogress-header">
        <div>
          <p className="assigned-card-number">{order.number}</p>
          <p className="assigned-card-customer">{order.customer.name}</p>
        </div>
        <div className="inprogress-meta">
          <span className="assigned-card-total">${order.total.toFixed(2)}</span>
          <span className="inprogress-status">{order.status.replace('_', ' ')}</span>
        </div>
      </header>
      <section className="inprogress-body">
        <p className="assigned-card-address">{order.customer.address}</p>
        <LocationLinks address={order.customer.address} />
        {order.notes ? <p className="assigned-card-notes">Note: {order.notes}</p> : null}
        <div className="inprogress-timeline">
          {timeline.map((entry) => (
            <div key={entry.label} className={`inprogress-step ${entry.timestamp ? 'completed' : ''}`.trim()}>
              <span className="inprogress-step-label">{entry.label}</span>
              <span className="inprogress-step-time">{formatRelativeTime(entry.timestamp ?? undefined)}</span>
            </div>
          ))}
        </div>
        <ul className="assigned-card-items">
          {order.items.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <span className="assigned-card-quantity">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      </section>
      {error ? (
        <p className="assigned-error" role="alert">
          {error}
        </p>
      ) : null}
      <footer className="inprogress-actions">
        {!hasStarted ? (
          <button type="button" className="driver-button-primary" onClick={handleStart} disabled={action !== null}>
            {action === 'start' ? 'Starting…' : 'Start Delivery'}
          </button>
        ) : null}
        {hasStarted && !hasArrived ? (
          <button type="button" className="driver-button-primary" onClick={handleArrive} disabled={action !== null}>
            {action === 'arrive' ? 'Updating…' : "I've Arrived"}
          </button>
        ) : null}
        {showVerification ? (
          <div className="verification-panel">
            <h3>Verification Checklist</h3>
            <label className="verification-checkbox">
              <input
                type="checkbox"
                checked={idVerified}
                onChange={(event) => setIdVerified(event.target.checked)}
              />
              <span>ID Verified (21+)</span>
            </label>
            <label className="verification-checkbox">
              <input
                type="checkbox"
                checked={paymentVerified}
                onChange={(event) => setPaymentVerified(event.target.checked)}
              />
              <span>Payment Verified</span>
            </label>
            <div className="verification-signature">
              <p>Customer Signature</p>
              <SignaturePad onChange={setSignature} />
            </div>
            <label className="verification-notes">
              <span>Delivery Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Add any final notes"
              />
            </label>
            <button
              type="button"
              className="driver-button-primary"
              onClick={handleComplete}
              disabled={action !== null || !canComplete}
            >
              {action === 'complete' ? 'Completing…' : 'Complete Delivery'}
            </button>
          </div>
        ) : null}
      </footer>
    </article>
  )
}
