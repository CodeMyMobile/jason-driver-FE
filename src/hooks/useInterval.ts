import { useEffect, useRef } from 'react'

type Callback = () => void

export function useInterval(callback: Callback, delay: number | null) {
  const savedCallback = useRef<Callback | null>(null)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return
    function tick() {
      savedCallback.current?.()
    }
    const id = window.setInterval(tick, delay)
    return () => {
      window.clearInterval(id)
    }
  }, [delay])
}
