import { useCallback, useEffect, useMemo, useState } from 'react'
import { acceptOrder, arriveOrder, completeOrder, getOrders, startOrder } from '../../api/orders'
import { DriverOrder } from '../types'
import type { CompleteOrderPayload } from '../../api/orders'
import { adaptOrder, adaptOrders } from '../adapters/orderAdapter'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'

interface UseDriverOrdersResult {
  assigned: DriverOrder[]
  inProgress: DriverOrder[]
  completed: DriverOrder[]
  isFetching: boolean
  refetch: () => Promise<void>
  accept: (orderId: string) => Promise<DriverOrder | undefined>
  start: (orderId: string) => Promise<DriverOrder | undefined>
  arrive: (orderId: string) => Promise<DriverOrder | undefined>
  complete: (orderId: string, payload: CompleteOrderPayload) => Promise<DriverOrder | undefined>
}

const IN_PROGRESS_STATUSES = new Set<DriverOrder['status']>(['IN_PROGRESS', 'ARRIVED', 'COMPLETED'])
const ACTIVE_STATUSES = new Set<DriverOrder['status']>(['ASSIGNED', 'IN_PROGRESS', 'ARRIVED'])
const COMPLETED_STATUSES = new Set<DriverOrder['status']>(['COMPLETED'])

export function useDriverOrders(): UseDriverOrdersResult {
  const { driver, setStatus } = useAuth()
  const { subscribe } = useSocket()
  const [orders, setOrders] = useState<DriverOrder[]>([])
  const [isFetching, setIsFetching] = useState(false)

  const upsertOrder = useCallback((incoming: DriverOrder) => {
    setOrders((current) => {
      const exists = current.some((order) => order.id === incoming.id)
      if (exists) {
        return current.map((order) => (order.id === incoming.id ? { ...order, ...incoming } : order))
      }
      return [incoming, ...current]
    })
  }, [])

  const refetch = useCallback(async () => {
    setIsFetching(true)
    try {
      const data = await getOrders()
      setOrders(adaptOrders(data))
    } finally {
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    const unsubscribeCreated = subscribe('ORDER_CREATED', (payload: unknown) => {
      upsertOrder(adaptOrder(payload))
    })
    const unsubscribeUpdated = subscribe('ORDER_UPDATED', (payload: unknown) => {
      upsertOrder(adaptOrder(payload))
    })
    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
    }
  }, [subscribe, upsertOrder])

  const assigned = useMemo(() => {
    if (!driver) return []
    return orders.filter((order) => {
      if (!order.assignedDriverId || order.assignedDriverId !== driver.id) return false
      const accepted = Boolean(order.acceptedAt)
      const isCompleted = Boolean(order.completedAt) || order.status === 'COMPLETED'
      return !accepted && !IN_PROGRESS_STATUSES.has(order.status) && !isCompleted
    })
  }, [driver, orders])

  const inProgress = useMemo(() => {
    if (!driver) return []
    return orders.filter((order) => {
      if (!order.assignedDriverId || order.assignedDriverId !== driver.id) return false
      const isCompleted = Boolean(order.completedAt) || order.status === 'COMPLETED'
      if (isCompleted) return false
      const accepted = Boolean(order.acceptedAt)
      const statusMatch = ACTIVE_STATUSES.has(order.status)
      return accepted || statusMatch
    })
  }, [driver, orders])

  const completed = useMemo(() => {
    if (!driver) return []
    return orders
      .filter((order) => {
        if (!order.assignedDriverId || order.assignedDriverId !== driver.id) return false
        const completedFlag = Boolean(order.completedAt) || COMPLETED_STATUSES.has(order.status)
        return completedFlag
      })
      .sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return timeB - timeA
      })
  }, [driver, orders])

  const accept = useCallback(
    async (orderId: string) => {
      try {
        const response = await acceptOrder(orderId)
        const normalized = adaptOrder(response)
        const ensured = {
          ...normalized,
          acceptedAt: normalized.acceptedAt ?? new Date().toISOString(),
        }
        upsertOrder(ensured)
        return ensured
      } catch (error) {
        console.error('Failed to accept order', error)
        throw error
      }
    },
    [setStatus, upsertOrder],
  )

  const start = useCallback(
    async (orderId: string) => {
      try {
        const response = await startOrder(orderId)
        const normalized = adaptOrder(response)
        const ensured = {
          ...normalized,
          startedAt: normalized.startedAt ?? new Date().toISOString(),
          acceptedAt: normalized.acceptedAt ?? new Date().toISOString(),
        }
        upsertOrder(ensured)
        try {
          await setStatus('ON_DELIVERY')
        } catch (error) {
          console.error('Failed to set driver status to ON_DELIVERY', error)
        }
        return ensured
      } catch (error) {
        console.error('Failed to start order', error)
        throw error
      }
    },
    [setStatus, upsertOrder],
  )

  const arrive = useCallback(
    async (orderId: string) => {
      try {
        const response = await arriveOrder(orderId)
        const normalized = adaptOrder(response)
        const ensured = {
          ...normalized,
          arrivedAt: normalized.arrivedAt ?? new Date().toISOString(),
          startedAt: normalized.startedAt ?? normalized.acceptedAt ?? new Date().toISOString(),
        }
        upsertOrder(ensured)
        try {
          await setStatus('ON_DELIVERY')
        } catch (error) {
          console.error('Failed to maintain driver ON_DELIVERY status', error)
        }
        return ensured
      } catch (error) {
        console.error('Failed to arrive order', error)
        throw error
      }
    },
    [setStatus, upsertOrder],
  )

  const complete = useCallback(
    async (orderId: string, payload: CompleteOrderPayload) => {
      try {
        const response = await completeOrder(orderId, payload)
        const normalized = adaptOrder(response)
        const ensured = {
          ...normalized,
          completedAt: normalized.completedAt ?? new Date().toISOString(),
        }
        upsertOrder(ensured)
        try {
          await setStatus('ONLINE')
        } catch (error) {
          console.error('Failed to return driver status to ONLINE', error)
        }
        return ensured
      } catch (error) {
        console.error('Failed to complete order', error)
        throw error
      }
    },
    [setStatus, upsertOrder],
  )

  return {
    assigned,
    inProgress,
    completed,
    isFetching,
    refetch,
    accept,
    start,
    arrive,
    complete,
  }
}
