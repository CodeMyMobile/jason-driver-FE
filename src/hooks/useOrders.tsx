import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { acceptOrder, completeOrder, getOrders } from '../api/orders'
import { arriveOrder } from '../api/orders'
import type { CompleteOrderPayload } from '../api/orders'
import { Order } from '../types'
import { useSocket } from './useSocket'
import { useToast } from './useToast'
import { useInterval } from './useInterval'

interface OrdersContextValue {
  orders: Order[]
  refresh: () => Promise<void>
  accept: (orderId: string) => Promise<void>
  markArrived: (orderId: string) => Promise<void>
  markComplete: (orderId: string, signature?: string) => Promise<void>
  isFetching: boolean
}

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined)

export function OrdersProvider({ children }: PropsWithChildren): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const { subscribe } = useSocket()
  const { push } = useToast()

  const mergeOrder = useCallback((next: Order) => {
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
    const unsubCreated = subscribe<Order>('ORDER_CREATED', (payload) => {
      mergeOrder(payload)
      push({ title: 'New delivery assigned', description: payload.number, variant: 'info' })
    })
    const unsubUpdated = subscribe<Order>('ORDER_UPDATED', (payload) => {
      mergeOrder(payload)
    })
    return () => {
      unsubCreated()
      unsubUpdated()
    }
  }, [mergeOrder, push, subscribe])

  const accept = useCallback(async (orderId: string) => {
    const order = await acceptOrder(orderId)
    mergeOrder(order)
    push({ title: 'Order accepted', description: order.number, variant: 'success' })
  }, [mergeOrder, push])

  const markArrived = useCallback(async (orderId: string) => {
    const order = await arriveOrder(orderId)
    mergeOrder(order)
    push({ title: 'Customer arrival logged', description: order.number, variant: 'info' })
  }, [mergeOrder, push])

  const markComplete = useCallback(async (orderId: string, signature?: string) => {
    let payload: CompleteOrderPayload | undefined
    if (signature) {
      payload = { proof: { signatureUrl: signature } }
    }
    const order = await completeOrder(orderId, payload)
    mergeOrder(order)
    push({ title: 'Delivery completed', description: order.number, variant: 'success' })
  }, [mergeOrder, push])

  const value = useMemo<OrdersContextValue>(
    () => ({ orders, refresh, accept, markArrived, markComplete, isFetching }),
    [accept, isFetching, markArrived, markComplete, orders, refresh],
  )

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders(): OrdersContextValue {
  const context = useContext(OrdersContext)
  if (!context) {
    throw new Error('useOrders must be used within OrdersProvider')
  }
  return context
}
