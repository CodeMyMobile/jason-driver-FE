import { Order } from '../types'

const pendingStatuses = new Set([
  'NEW',
  'PENDING',
])

const activeStatuses = new Set([
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'ARRIVED',
  'EN_ROUTE',
  'OUT_FOR_DELIVERY',
])

const completedStatuses = new Set([
  'COMPLETED',
  'CANCELLED',
  'DELIVERED',
  'RETURNED',
])

export function normalizeOrderStatus(status: Order['status'] | string): string {
  return String(status).trim().toUpperCase()
}

export function isPendingOrder(order: Order): boolean {
  return pendingStatuses.has(normalizeOrderStatus(order.status))
}

export function isActiveOrder(order: Order): boolean {
  const normalized = normalizeOrderStatus(order.status)
  return activeStatuses.has(normalized) || (!pendingStatuses.has(normalized) && !completedStatuses.has(normalized))
}

export function isCompletedOrder(order: Order): boolean {
  return completedStatuses.has(normalizeOrderStatus(order.status))
}

export function segmentOrders(orders: Order[]): {
  pending: Order[]
  active: Order[]
  completed: Order[]
} {
  return orders.reduce(
    (segments, order) => {
      if (isPendingOrder(order)) {
        segments.pending.push(order)
      } else if (isCompletedOrder(order)) {
        segments.completed.push(order)
      } else {
        segments.active.push(order)
      }
      return segments
    },
    { pending: [] as Order[], active: [] as Order[], completed: [] as Order[] },
  )
}
