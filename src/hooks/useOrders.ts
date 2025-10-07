import { useCallback } from 'react'
import {
  acceptOrder,
  arriveOrder,
  completeOrder,
  fetchOrder,
  fetchOrdersByStatus,
  startOrder,
} from '../api/orders'
import type { Order } from '../types'
import { useMutation, useQuery, useQueryClient } from './queryClient'

export function useOrdersByStatus(status: string) {
  return useQuery(['orders', status], () => fetchOrdersByStatus(status), { staleTime: 15000 })
}

export function useOrder(orderId: string) {
  return useQuery(['order', orderId], () => fetchOrder(orderId), { staleTime: 15000 })
}

export function useOrderActions(orderId: string) {
  const client = useQueryClient()

  const invalidate = useCallback(() => {
    client.invalidateQueries('orders')
    void client.fetchQuery(['order', orderId], () => fetchOrder(orderId))
  }, [client, orderId])

  const accept = useMutation<void, void>({
    mutationFn: async () => acceptOrder(orderId),
    onSuccess: invalidate,
  })

  const start = useMutation<void, void>({
    mutationFn: async () => startOrder(orderId),
    onSuccess: invalidate,
  })

  const arrive = useMutation<void, void>({
    mutationFn: async () => arriveOrder(orderId),
    onSuccess: invalidate,
  })

  const complete = useMutation<void, { signatureUrl: string; notes?: string }>({
    mutationFn: (variables) => completeOrder(orderId, variables),
    onSuccess: invalidate,
  })

  return {
    accept,
    start,
    arrive,
    complete,
  }
}

export function useOptimisticOrderUpdate(status: string) {
  const client = useQueryClient()
  return useCallback(
    (order: Order) => {
      const queryKey = ['orders', status] as const
      const entry = client.getEntry<Order[]>(queryKey)
      const existing = entry.data ?? []
      const next = existing.some((item) => item.id === order.id)
        ? existing.map((item) => (item.id === order.id ? order : item))
        : [...existing, order]
      client.setQueryData(queryKey, next)
    },
    [client, status],
  )
}
