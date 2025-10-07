import { apiClient } from './client'
import type { Message, ThreadSummary } from '../types'

export async function fetchThreads(orderId?: string): Promise<ThreadSummary[]> {
  const { data } = await apiClient.get<ThreadSummary[]>(`/chat/threads`, {
    params: orderId ? { orderId } : undefined,
  })
  return data
}

export async function fetchMessages(threadId: string): Promise<Message[]> {
  const { data } = await apiClient.get<Message[]>(`/chat/threads/${threadId}/messages`)
  return data
}

export async function postMessage(threadId: string, payload: { text?: string; imageUrl?: string }) {
  const { data } = await apiClient.post<Message>(`/chat/threads/${threadId}/messages`, payload)
  return data
}
