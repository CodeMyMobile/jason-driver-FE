import { useEffect, useRef } from 'react'

import { createSocket } from './socket'

const ORDER_EVENTS = [
  'ORDER_UPDATED',
  'ORDERS_UPDATED',
  'ORDER_CREATED',
  'ORDER_ASSIGNED',
  'ORDER_STATUS_CHANGED',
]

const LEGACY_CONNECT_EVENTS = ['connected drivers', 'drivers connected', 'CONNECTED_DRIVERS']

export function useOrdersSocket({ driverChannel, enabled, onEvent }) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    if (!socketRef.current) {
      socketRef.current = createSocket()
    }

    const socket = socketRef.current
    socket.connect()

    const subscriptions = []

    const register = (eventName, handler) => socket.on(eventName, handler)

    const createHandler = (eventName) => (payload) => {
      if (typeof onEvent === 'function') {
        onEvent(eventName, payload)
      }
    }

    ORDER_EVENTS.forEach((eventName) => {
      subscriptions.push(register(eventName, createHandler(eventName)))
    })

    LEGACY_CONNECT_EVENTS.forEach((eventName) => {
      subscriptions.push(register(eventName, () => {}))
    })

    if (driverChannel) {
      subscriptions.push(register(driverChannel, createHandler(driverChannel)))
    }

    return () => {
      subscriptions.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      })
    }
  }, [driverChannel, enabled, onEvent])

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])
}
