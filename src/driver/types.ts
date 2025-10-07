import { OrderStatus } from '../types'

export interface DriverOrderItem {
  id: string
  name: string
  quantity: number
}

export interface DriverCustomer {
  name: string
  phone?: string
  address: string
  lat?: number
  lng?: number
}

export interface DriverOrder {
  id: string
  number: string
  total: number
  status: OrderStatus
  requiresIdCheck: boolean
  requiresPaymentCheck: boolean
  createdAt: string
  assignedDriverId?: string
  acceptedAt?: string | null
  startedAt?: string | null
  arrivedAt?: string | null
  completedAt?: string | null
  customer: DriverCustomer
  items: DriverOrderItem[]
  priority?: boolean
  notes?: string
}
