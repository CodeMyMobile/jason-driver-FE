import { apiClient, safeRequest } from './client'
import { mockOrders } from './mockData'
import { Order } from '../types'

export interface CompleteOrderPayload {
  proof?: { signatureUrl: string }
  notes?: string
}

export async function getOrders(): Promise<Order[]> {
  return safeRequest(
    async () => {
      const response = await apiClient.get<Order[]>('/orders')
      return response.data
    },
    async () => mockOrders,
  )
}

export async function acceptOrder(orderId: string): Promise<Order> {
  return safeRequest(
    async () => {
      const response = await apiClient.post<Order>(`/orders/${orderId}/accept`)
      return response.data
    },
    async () => {
      const existing = mockOrders.find((order) => order.id === orderId)
      if (!existing) {
        throw new Error('Order not found')
      }
      existing.status = 'IN_PROGRESS'
      ;(existing as Record<string, unknown>).acceptedAt = new Date().toISOString()
      return existing
    },
  )
}

export async function startOrder(orderId: string): Promise<Order> {
  return safeRequest(
    async () => {
      const response = await apiClient.post<Order>(`/orders/${orderId}/start`)
      return response.data
    },
    async () => {
      const existing = mockOrders.find((order) => order.id === orderId)
      if (!existing) {
        throw new Error('Order not found')
      }
      existing.status = 'IN_PROGRESS'
      ;(existing as Record<string, unknown>).startedAt = new Date().toISOString()
      return existing
    },
  )
}

export async function arriveOrder(orderId: string): Promise<Order> {
  return safeRequest(
    async () => {
      const response = await apiClient.post<Order>(`/orders/${orderId}/arrive`)
      return response.data
    },
    async () => {
      const existing = mockOrders.find((order) => order.id === orderId)
      if (!existing) {
        throw new Error('Order not found')
      }
      existing.status = 'ARRIVED'
      ;(existing as Record<string, unknown>).arrivedAt = new Date().toISOString()
      return existing
    },
  )
}

export async function completeOrder(orderId: string, payload?: CompleteOrderPayload): Promise<Order> {
  return safeRequest(
    async () => {
      const response = await apiClient.post<Order>(`/orders/${orderId}/complete`, payload ?? {})
      return response.data
    },
    async () => {
      const existing = mockOrders.find((order) => order.id === orderId)
      if (!existing) {
        throw new Error('Order not found')
      }
      existing.status = 'COMPLETED'
      ;(existing as Record<string, unknown>).completedAt = new Date().toISOString()
      return existing
    },
  )
}

export function getElapsedMinutes(order: Order): number {
  const start = new Date(order.createdAt)
  const now = new Date()
  const diff = (now.getTime() - start.getTime()) / 60000
  return Math.max(0, diff)
}

export function getEta(order: Order): string {
  const minutes = getElapsedMinutes(order)
  const eta = new Date(new Date(order.createdAt).getTime() + Math.round(minutes) * 60000)
  return eta.toISOString()
}
