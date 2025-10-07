import { useEffect, useRef, useState } from 'react'
import { sendLocation } from '../api/telemetry'

interface Options {
  isActive: boolean
}

export function useLocationTracking({ isActive }: Options): boolean {
  const [tracking, setTracking] = useState(false)
  const watchId = useRef<number | null>(null)
  const lastSent = useRef<number>(0)

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
        setTracking(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    if (!isActive) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
      setTracking(false)
      return
    }

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported')
      return
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setTracking(true)
        const now = Date.now()
        if (now - lastSent.current < 15000) {
          return
        }
        lastSent.current = now
        void sendLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: now,
        })
      },
      (error) => {
        console.warn('Geolocation error', error)
        setTracking(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [isActive])

  return tracking
}
