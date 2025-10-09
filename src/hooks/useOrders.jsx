import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { acceptOrder, arriveOrder, completeOrder, getOrders } from '../api/orders.ts'
import { useSocket } from './useSocket.jsx'
import { useToast } from './useToast.jsx'
import { useInterval } from './useInterval.ts'

const OrdersContext = createContext(undefined)

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([])
  const [isFetching, setIsFetching] = useState(false)
  const { subscribe } = useSocket()
  const { push } = useToast()

  const mergeOrder = useCallback((next) => {
    const normalized = { ...next }
    setOrders((current) => {
      const existing = current.find((order) => order.id === normalized.id)
      if (existing) {
        return current.map((order) => (order.id === normalized.id ? { ...existing, ...normalized } : order))
      }
      return [normalized, ...current]
    })
  }, [])

  const refresh = useCallback(async () => {
    setIsFetching(true)
    try {
      const data = await getOrders()
      setOrders(data.map((order) => ({ ...order })))
    } finally {
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useInterval(refresh, 15000)

  useEffect(() => {
    const unsubCreated = subscribe('ORDER_CREATED', (payload) => {
      mergeOrder(payload)
      push({ title: 'New delivery assigned', description: payload.number, variant: 'info' })
    })
    const unsubUpdated = subscribe('ORDER_UPDATED', (payload) => {
      mergeOrder(payload)
    })
    return () => {
      unsubCreated()
      unsubUpdated()
    }
  }, [mergeOrder, push, subscribe])

  const accept = useCallback(
    async (orderId) => {
      const order = await acceptOrder(orderId)
      mergeOrder(order)
      push({ title: 'Order accepted', description: order.number, variant: 'success' })
    },
    [mergeOrder, push],
  )

  const markArrived = useCallback(
    async (orderId) => {
      const order = await arriveOrder(orderId)
      mergeOrder(order)
      push({ title: 'Customer arrival logged', description: order.number, variant: 'info' })
    },
    [mergeOrder, push],
  )

  const markComplete = useCallback(
    async (orderId, signature) => {
      const order = await completeOrder(orderId, signature)
      mergeOrder(order)
      push({ title: 'Delivery completed', description: order.number, variant: 'success' })
    },
    [mergeOrder, push],
  )

  const value = useMemo(
    () => ({ orders, refresh, accept, markArrived, markComplete, isFetching }),
    [accept, isFetching, markArrived, markComplete, orders, refresh],
  )

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) {
    throw new Error('useOrders must be used within OrdersProvider')
  }
  return context
}
