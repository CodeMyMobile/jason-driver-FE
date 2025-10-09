function getElapsedMinutes(order) {
  if (!order) {
    return 0
  }
  const timestamp = order.createdAt ?? order.created_at ?? order.updatedAt
  if (!timestamp) {
    return 0
  }
  const start = new Date(timestamp)
  if (Number.isNaN(start.getTime())) {
    return 0
  }
  const diff = (Date.now() - start.getTime()) / 60000
  return diff > 0 ? diff : 0
}

function formatDuration(minutes) {
  const wholeMinutes = Math.floor(minutes)
  const seconds = Math.floor((minutes - wholeMinutes) * 60)
  return `${wholeMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function TimerChip({ order }) {
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
