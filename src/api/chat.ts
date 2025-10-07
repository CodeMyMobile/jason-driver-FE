import { apiClient, safeRequest } from './client'
import { mockMessages } from './mockData'
import { Message } from '../types'

export async function getMessages(): Promise<Message[]> {
  return safeRequest(
    async () => {
      const response = await apiClient.get<Message[]>('/chat/threads/current')
      return response.data
    },
    async () => mockMessages,
  )
}

export async function sendMessage(text: string): Promise<Message> {
  return safeRequest(
    async () => {
      const response = await apiClient.post<Message>('/chat/threads/current', { text })
      return response.data
    },
    async () => {
      const message: Message = {
        id: `local-${Date.now()}`,
        sender: 'DRIVER',
        text,
        createdAt: new Date().toISOString(),
      }
      mockMessages.push(message)
      return message
    },
  )
}
