import { apiClient, safeRequest } from './client'
import { Order } from '../types'

export async function getOrders(): Promise<Order[]> {
  return safeRequest(async () => {
    const response = await apiClient.get<Order[]>('/orders')
    return response.data
  })
}

export async function acceptOrder(orderId: string): Promise<Order> {
  return safeRequest(async () => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/accept`)
    return response.data
  })
}

export async function startOrder(orderId: string): Promise<Order> {
  return safeRequest(async () => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/start`)
    return response.data
  })
}

export async function arriveOrder(orderId: string): Promise<Order> {
  return safeRequest(async () => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/arrive`)
    return response.data
  })
}

export async function completeOrder(orderId: string, signature?: string): Promise<Order> {
  return safeRequest(async () => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/complete`, {
      proof: signature ? { signatureUrl: signature } : undefined,
    })
    return response.data
  })
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
