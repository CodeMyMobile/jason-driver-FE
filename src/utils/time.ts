export function minutesSince(dateIso: string): number {
  const created = new Date(dateIso).getTime()
  const now = Date.now()
  return Math.max(0, (now - created) / 60000)
}

export type TimerVariant = 'normal' | 'warning' | 'priority'

export function determineTimerVariant(minutes: number): TimerVariant {
  if (minutes >= 35) return 'priority'
  if (minutes >= 25) return 'warning'
  return 'normal'
}

export function formatMinutesToClock(minutes: number): string {
  const totalSeconds = Math.floor(minutes * 60)
  const mins = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
