import { AuthResponse, Driver, Message, Order } from '../types'

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

export const mockOrders: Order[] = [
  {
    id: 'order-1',
    number: 'JL-2847',
    total: 127.5,
    status: 'NEW',
    requiresIdCheck: true,
    requiresPaymentCheck: true,
    createdAt: minutesAgo(35),
    customer: {
      name: 'Michael Rodriguez',
      phone: '(555) 123-4567',
      address: '85 Dolores Street, San Francisco, CA 94110',
    },
    priority: true,
    assignedDriverId: 'driver-1',
    items: [
      { id: 'item-1', name: 'Johnnie Walker Black Label', quantity: 1 },
      { id: 'item-2', name: 'Grey Goose Vodka', quantity: 1 },
      { id: 'item-3', name: 'Corona Extra 6-pack', quantity: 1 },
    ],
  },
  {
    id: 'order-2',
    number: 'JL-2846',
    total: 156,
    status: 'IN_PROGRESS',
    requiresIdCheck: true,
    requiresPaymentCheck: true,
    createdAt: minutesAgo(28),
    customer: {
      name: 'John Doe',
      phone: '(555) 246-8135',
      address: '123 Market Street, San Francisco, CA 94103',
      lat: 37.7937,
      lng: -122.396,
    },
    assignedDriverId: 'driver-1',
    items: [
      { id: 'item-4', name: 'Don Julio Blanco', quantity: 1 },
      { id: 'item-5', name: 'Casamigos Reposado', quantity: 1 },
      { id: 'item-6', name: 'Limes', quantity: 6 },
    ],
  },
  {
    id: 'order-3',
    number: 'JL-2845',
    total: 98.4,
    status: 'COMPLETED',
    requiresIdCheck: true,
    requiresPaymentCheck: true,
    createdAt: minutesAgo(125),
    customer: {
      name: 'Alice Lee',
      phone: '(555) 678-9012',
      address: '678 Mission Street, San Francisco, CA 94105',
    },
    assignedDriverId: 'driver-1',
    items: [
      { id: 'item-7', name: 'Veuve Clicquot Brut', quantity: 2 },
      { id: 'item-8', name: 'San Pellegrino', quantity: 4 },
    ],
  },
]

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
