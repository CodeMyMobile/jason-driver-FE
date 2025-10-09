import { AuthResponse, Driver, Message } from '../types'

const now = new Date()

function minutesAgo(minutes: number): string {
  return new Date(now.getTime() - minutes * 60000).toISOString()
}

export const mockDriver: Driver = {
  id: 'driver-1',
  name: 'Jordan Smith',
  phone: '+1 (555) 555-1212',
  email: 'driver@example.com',
  status: 'ONLINE',
}

export const mockAuthResponse: AuthResponse = {
  token: 'demo-token',
  driver: mockDriver,
}

export const mockMessages: Message[] = [
  {
    id: 'message-1',
    sender: 'STAFF',
    text: 'Please confirm the ID when you arrive at the customer location.',
    createdAt: minutesAgo(12),
  },
  {
    id: 'message-2',
    sender: 'DRIVER',
    text: 'On my way, ETA 5 minutes.',
    createdAt: minutesAgo(4),
  },
]
