import { apiClient } from './client'
import type { Order } from '../types'

export async function fetchOrdersByStatus(status: string): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>(`/orders`, { params: { status } })
  return data
}

export async function fetchOrder(id: string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/orders/${id}`)
  return data
}

export async function acceptOrder(id: string) {
  await apiClient.post(`/orders/${id}/accept`)
}

export async function startOrder(id: string) {
  await apiClient.post(`/orders/${id}/start`)
}

export async function arriveOrder(id: string) {
  await apiClient.post(`/orders/${id}/arrive`)
}

export async function completeOrder(
  id: string,
  payload: {
    signatureUrl: string
    notes?: string
  },
) {
  await apiClient.post(`/orders/${id}/complete`, { proof: payload })
}
