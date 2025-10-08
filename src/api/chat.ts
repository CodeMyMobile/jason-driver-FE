import { apiClient, safeRequest } from './client'
import { Message } from '../types'

export async function getMessages(): Promise<Message[]> {
  return safeRequest(async () => {
    const response = await apiClient.get<Message[]>('/chat/threads/current')
    return response.data
  })
}

export async function sendMessage(text: string): Promise<Message> {
  return safeRequest(async () => {
    const response = await apiClient.post<Message>('/chat/threads/current', { text })
    return response.data
  })
}
