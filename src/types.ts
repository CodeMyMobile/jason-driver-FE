export type DriverStatus = 'OFFLINE' | 'ONLINE' | 'ON_DELIVERY'

export interface Driver {
  id: string
  name: string
  phone: string
  photoUrl?: string
  status: DriverStatus
}

export type OrderStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED'

export interface Customer {
  name: string
  phone?: string
  address: string
  lat?: number
  lng?: number
  notes?: string
}

export interface Order {
  id: string
  total: number
  status: OrderStatus
  customer: Customer
  requiresIdCheck: boolean
  createdAt: string
  assignedDriverId?: string
  arrivedAt?: string
  startedAt?: string
  completedAt?: string
}

export type ThreadParticipant = 'CUSTOMER' | 'STAFF' | 'DRIVER'

export interface ThreadSummary {
  id: string
  participants: ThreadParticipant[]
  lastMessageAt: string
  orderId?: string
}

export type MessageSender = 'CUSTOMER' | 'STAFF' | 'DRIVER'

export interface Message {
  id: string
  sender: MessageSender
  text?: string
  imageUrl?: string
  createdAt: string
}

export interface LocationPayload {
  lat: number
  lng: number
  speed?: number | null
  heading?: number | null
  accuracy?: number | null
  orderId?: string
  timestamp: string
}

export interface ApiListResponse<T> {
  data: T
}
