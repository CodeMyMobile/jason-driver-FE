import { useEffect, useRef } from 'react'
import { postLocation } from '../api/telemetry'
import { usePageVisibility } from './usePageVisibility'

interface Options {
  enabled: boolean
  orderId?: string
  intervalMs?: number
}

export function useLocationStreamer({ enabled, orderId, intervalMs = 15000 }: Options) {
  const watchId = useRef<number | null>(null)
  const lastSent = useRef<number>(0)
  const buffer = useRef<GeolocationPosition[]>([])
  const isVisible = usePageVisibility()

  useEffect(() => {
    if (!enabled || !isVisible) {
      if (watchId.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
      return
    }

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation not supported in this browser')
      return
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        buffer.current.push(position)
        void flush()
      },
      (error) => {
        console.error('Location error', error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    )

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [enabled, isVisible, intervalMs, orderId])

  async function flush() {
    const now = Date.now()
    if (now - lastSent.current < intervalMs) {
      return
    }
    const positions = buffer.current.splice(0, buffer.current.length)
    if (positions.length === 0) return
    lastSent.current = now
    const latest = positions[positions.length - 1]
    const { latitude, longitude, speed, heading, accuracy } = latest.coords
    await postLocation({
      lat: latitude,
      lng: longitude,
      speed: speed ?? null,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
      orderId,
      timestamp: new Date(latest.timestamp).toISOString(),
    })
  }
}
