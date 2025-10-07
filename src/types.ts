export type DriverStatus = 'ONLINE' | 'OFFLINE' | 'ON_DELIVERY'

export interface Driver {
  id: string
  name: string
  phone: string
  email: string
  status: DriverStatus
}

export interface Customer {
  name: string
  phone: string
  address: string
  lat?: number
  lng?: number
}

export type OrderStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface OrderItem {
  id: string
  name: string
  quantity: number
}

export interface Order {
  id: string
  number: string
  total: number
  status: OrderStatus
  requiresIdCheck: boolean
  requiresPaymentCheck: boolean
  createdAt: string
  acceptedAt?: string | null
  startedAt?: string | null
  arrivedAt?: string | null
  completedAt?: string | null
  customer: Customer
  priority?: boolean
  items: OrderItem[]
  assignedDriverId?: string
}

export type MessageSender = 'CUSTOMER' | 'STAFF' | 'DRIVER'

export interface Message {
  id: string
  sender: MessageSender
  text: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  driver: Driver
}

export interface LocationPayload {
  lat: number
  lng: number
  timestamp: number
}

export interface SocketEvent<T = unknown> {
  type: string
  payload: T
}
