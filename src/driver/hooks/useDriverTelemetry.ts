import { useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useLocationTracking } from '../../hooks/useLocationTracking'

export function useDriverTelemetry(): { tracking: boolean; isActive: boolean } {
  const { driver } = useAuth()
  const isActive = useMemo(() => {
    if (!driver) return false
    return driver.status === 'ONLINE' || driver.status === 'ON_DELIVERY'
  }, [driver])
  const tracking = useLocationTracking({ isActive })
  return { tracking, isActive }
}
