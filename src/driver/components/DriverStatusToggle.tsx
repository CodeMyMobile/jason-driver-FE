import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { DriverStatus } from '../../types'

const STATUS_OPTIONS: DriverStatus[] = ['OFFLINE', 'ONLINE', 'ON_DELIVERY']

const LABELS: Record<DriverStatus, string> = {
  OFFLINE: 'Offline',
  ONLINE: 'Online',
  ON_DELIVERY: 'On Delivery',
}

export function DriverStatusToggle(): JSX.Element {
  const { driver, setStatus } = useAuth()
  const [updating, setUpdating] = useState(false)
  const currentStatus = useMemo<DriverStatus>(() => driver?.status ?? 'OFFLINE', [driver?.status])

  const handleSelect = useCallback(
    async (next: DriverStatus) => {
      if (updating || next === currentStatus) {
        return
      }
      setUpdating(true)
      try {
        await setStatus(next)
      } catch (error) {
        console.error('Failed to update driver status', error)
      } finally {
        setUpdating(false)
      }
    },
    [currentStatus, setStatus, updating],
  )

  return (
    <div className="driver-status-toggle" role="group" aria-label="Driver availability">
      {STATUS_OPTIONS.map((status) => {
        const isActive = currentStatus === status
        const isManual = status !== 'ON_DELIVERY'
        return (
          <button
            key={status}
            type="button"
            className={`driver-status-option ${isActive ? 'active' : ''}`.trim()}
            onClick={() => (isManual ? handleSelect(status) : undefined)}
            disabled={updating || (!isManual && !isActive)}
            aria-pressed={isActive}
            data-status={status}
          >
            {LABELS[status]}
          </button>
        )
      })}
    </div>
  )
}
