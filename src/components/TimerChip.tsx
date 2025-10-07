import { Order } from '../types'
import { getElapsedMinutes } from '../api/orders'

interface TimerChipProps {
  order: Order
}

function formatDuration(minutes: number): string {
  const wholeMinutes = Math.floor(minutes)
  const seconds = Math.floor((minutes - wholeMinutes) * 60)
  return `${wholeMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function TimerChip({ order }: TimerChipProps): JSX.Element {
  const elapsed = getElapsedMinutes(order)
  const variant = elapsed < 20 ? 'normal' : elapsed < 35 ? 'warning' : 'priority'

  return (
    <div className="order-timer">
      <div className={`timer-display ${variant}`}>
        <span className="timer-value">{formatDuration(elapsed)}</span>
      </div>
      <span className="timer-label">Time Since Order</span>
    </div>
  )
}
