import { useMemo, useState } from 'react'
import { determineTimerVariant, formatMinutesToClock, minutesSince, type TimerVariant } from '../utils/time'
import { useInterval } from '../hooks/useInterval'

interface TimerChipProps {
  createdAt: string
}

export function TimerChip({ createdAt }: TimerChipProps) {
  const [minutes, setMinutes] = useState(() => minutesSince(createdAt))
  useInterval(() => {
    setMinutes(minutesSince(createdAt))
  }, 30000)

  const variant: TimerVariant = useMemo(() => determineTimerVariant(minutes), [minutes])
  const display = useMemo(() => formatMinutesToClock(minutes), [minutes])

  return (
    <div className={`timer-display ${variant}`}>
      <span className="timer-value">{display}</span>
    </div>
  )
}
