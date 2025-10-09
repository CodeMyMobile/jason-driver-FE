import { AxiosError } from 'axios'
import { apiClient } from './client'
import { Customer, Order, OrderItem, OrderStatus } from '../types'

type RawOrder = Record<string, unknown>

function normalizeOrderStatus(rawStatus: unknown): OrderStatus {
  if (typeof rawStatus !== 'string') {
    return 'NEW'
  }
  const normalized = rawStatus.trim().toLowerCase()
  if (!normalized) return 'NEW'

  if (normalized.includes('cancel')) {
    return 'CANCELLED'
  }
  if (normalized.includes('complete') || normalized.includes('deliver')) {
    return 'COMPLETED'
  }
  if (normalized.includes('arriv')) {
    return 'ARRIVED'
  }
  if (normalized.includes('progress') || normalized.includes('accept') || normalized.includes('active')) {
    return 'IN_PROGRESS'
  }
  if (normalized.includes('assign') || normalized.includes('pending') || normalized.includes('new')) {
    return 'NEW'
  }

  return 'NEW'
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    const parsed = Number.parseFloat(cleaned)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

function extractOrderId(data: RawOrder): string {
  const id =
    data.id ??
    data._id ??
    data.orderId ??
    data.order_id ??
    data.uuid ??
    data.guid ??
    data.reference ??
    data.referenceId ??
    data.reference_id
  return String(id ?? '') || `order-${Date.now()}`
}

function extractOrderNumber(data: RawOrder, id: string): string {
  const number =
    data.number ??
    data.orderNumber ??
    data.order_number ??
    data.invoiceNumber ??
    data.invoice_number ??
    data.slug
  if (typeof number === 'string' && number.trim()) {
    return number.trim()
  }
  if (typeof number === 'number') {
    return String(number)
  }
  return id
}

function extractCustomerName(owner: any): string {
  if (!owner) return 'Customer'
  if (typeof owner === 'string' && owner.trim()) {
    return owner.trim()
  }
  const name = owner.name ?? owner.fullName ?? owner.full_name ?? owner.displayName
  if (typeof name === 'string' && name.trim()) {
    return name.trim()
  }
  const first = owner.firstName ?? owner.first_name ?? owner.givenName ?? owner.given_name
  const last = owner.lastName ?? owner.last_name ?? owner.familyName ?? owner.family_name
  const combined = [first, last].filter(Boolean).map((part: unknown) => String(part).trim()).filter(Boolean)
  if (combined.length > 0) {
    return combined.join(' ')
  }
  if (typeof owner.email === 'string' && owner.email.trim()) {
    return owner.email.trim()
  }
  return 'Customer'
}

function extractCustomerPhone(owner: any): string {
  const phone =
    owner?.phone ??
    owner?.phoneNumber ??
    owner?.phone_number ??
    owner?.mobile ??
    owner?.mobileNumber ??
    owner?.mobile_number ??
    owner?.contact
  return typeof phone === 'string' ? phone : ''
}

function extractAddressString(address: any): string {
  if (!address) {
    return 'Address unavailable'
  }
  if (typeof address === 'string') {
    return address
  }
  const lines: string[] = []
  const description =
    address.description ??
    address.street ??
    address.street1 ??
    address.street_1 ??
    address.line1 ??
    address.line_1 ??
    address.address1 ??
    address.address_1
  const apartment = address.apartment ?? address.unit ?? address.suite
  const city = address.city ?? address.town
  const state = address.state ?? address.region
  const postal = address.zip ?? address.zipCode ?? address.zip_code ?? address.postalCode ?? address.postal_code
  const country = address.country

  if (description) {
    lines.push(String(description))
  }
  if (apartment) {
    lines.push(`Apt ${apartment}`)
  }

  const locality = [city, state].filter(Boolean).join(', ')
  const finalLine = [locality || undefined, postal, country].filter(Boolean).join(' ')
  if (finalLine) {
    lines.push(finalLine.trim())
  }

  if (lines.length === 0 && typeof address.formatted === 'string') {
    return address.formatted
  }

  return lines.length > 0 ? lines.join(', ') : 'Address unavailable'
}

function extractCoordinates(address: any): { lat?: number; lng?: number } {
  if (!address) return {}
  const loc = address.loc ?? address.location ?? address.coordinates
  if (Array.isArray(loc) && loc.length >= 2) {
    const [lng, lat] = loc
    const latNum = typeof lat === 'number' ? lat : Number.parseFloat(String(lat))
    const lngNum = typeof lng === 'number' ? lng : Number.parseFloat(String(lng))
    return {
      lat: Number.isFinite(latNum) ? latNum : undefined,
      lng: Number.isFinite(lngNum) ? lngNum : undefined,
    }
  }
  const latitude = address.lat ?? address.latitude
  const longitude = address.lng ?? address.longitude
  return {
    lat: typeof latitude === 'number' ? latitude : undefined,
    lng: typeof longitude === 'number' ? longitude : undefined,
  }
}

function extractCustomer(data: RawOrder): Customer {
  const owner = data.owner ?? data.customer ?? data.user
  const address = data.address ?? data.deliveryAddress ?? data.shippingAddress
  const name = extractCustomerName(owner)
  const phone = extractCustomerPhone(owner ?? {})
  const formattedAddress = extractAddressString(address)
  const coords = extractCoordinates(address)

  return {
    name,
    phone,
    address: formattedAddress,
    ...coords,
  }
}

function extractItems(data: RawOrder): OrderItem[] {
  const products: any[] = Array.isArray(data.products)
    ? data.products
    : Array.isArray(data.items)
    ? data.items
    : []

  const quantities: Array<number | string | undefined> = Array.isArray((data as any).qty)
    ? ((data as any).qty as Array<number | string | undefined>)
    : []

  return products.map((product, index) => {
    const id =
      product?.id ??
      product?._id ??
      product?.productId ??
      product?.product_id ??
      product?.sku ??
      `${extractOrderId(data)}-item-${index}`
    const nameSource =
      product?.name ??
      product?.title ??
      product?.Description ??
      product?.description ??
      'Item'
    const size = product?.Size ?? product?.size
    const quantityRaw =
      product?.quantity ??
      product?.qty ??
      product?.count ??
      quantities[index] ??
      1
    const quantity = Number.parseInt(String(quantityRaw), 10)

    return {
      id: String(id),
      name: size ? `${String(nameSource)} ${String(size)}`.trim() : String(nameSource),
      quantity: Number.isFinite(quantity) ? quantity : 1,
    }
  })
}

function extractBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return false
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }
  if (typeof value === 'number') {
    return value === 1
  }
  return false
}

function extractDriverId(data: RawOrder): string | undefined {
  const id =
    data.assignedDriverId ??
    data.assigned_driver_id ??
    data.driverId ??
    data.driver_id ??
    data.driverID ??
    data.driver ??
    data.driverUuid ??
    data.driver_uuid
  if (typeof id === 'object' && id && 'id' in (id as Record<string, unknown>)) {
    return String((id as Record<string, unknown>).id ?? '') || undefined
  }
  if (typeof id === 'object' && id && '_id' in (id as Record<string, unknown>)) {
    return String((id as Record<string, unknown>)._id ?? '') || undefined
  }
  if (typeof id === 'string' || typeof id === 'number') {
    const stringId = String(id)
    return stringId ? stringId : undefined
  }
  return undefined
}

function extractCreatedAt(data: RawOrder): string {
  const value =
    data.createdAt ??
    data.created_at ??
    data.created ??
    data.createdDate ??
    data.created_date ??
    data.timestamp
  if (typeof value === 'string' && value) {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }
  return new Date().toISOString()
}

function normalizeOrder(data: RawOrder): Order {
  const id = extractOrderId(data)
  const status = normalizeOrderStatus(data.status)
  const customer = extractCustomer(data)
  const items = extractItems(data)
  const total = parseNumber(
    data.total ??
      data.totalPrice ??
      data.total_price ??
      data.totalAmount ??
      data.total_amount ??
      data.amount ??
      data.orderTotal ??
      data.order_total ??
      data.paymentTotal ??
      data.payment_total ??
      data.grandTotal ??
      data.grand_total,
  )

  return {
    id,
    number: extractOrderNumber(data, id),
    total,
    status,
    requiresIdCheck: extractBoolean(
      data.requiresIdCheck ??
        data.requires_id_check ??
        data.requireIdCheck ??
        data.require_id_check ??
        data.requireIdVerification ??
        data.require_id_verification ??
        data.idVerification ??
        data.id_verification,
    ),
    requiresPaymentCheck: extractBoolean(
      data.requiresPaymentCheck ??
        data.requires_payment_check ??
        data.requirePaymentCheck ??
        data.require_payment_check ??
        data.requirePaymentVerification ??
        data.paymentVerification ??
        data.payment_verification,
    ),
    createdAt: extractCreatedAt(data),
    customer,
    priority: extractBoolean(data.priority ?? data.isPriority ?? data.priorityOrder ?? data.rush),
    items,
    assignedDriverId: extractDriverId(data),
  }
}

function extractOrderList(payload: any): RawOrder[] {
  if (Array.isArray(payload)) {
    return payload as RawOrder[]
  }
  if (Array.isArray(payload?.orders)) {
    return payload.orders as RawOrder[]
  }
  if (Array.isArray(payload?.data)) {
    return payload.data as RawOrder[]
  }
  return []
}

async function updateOrder(orderId: string, updates: Record<string, unknown>): Promise<Order> {
  const body = { ...updates, _id: orderId }
  let lastError: unknown

  const attempts: Array<() => Promise<RawOrder>> = [
    async () => {
      const response = await apiClient.patch<RawOrder>(`/drivers/orders/${orderId}`, body)
      return response.data
    },
    async () => {
      const response = await apiClient.put<RawOrder>('/drivers/orders', body)
      return response.data
    },
    async () => {
      const response = await apiClient.post<RawOrder>('/drivers/orders/update', body)
      return response.data
    },
  ]

  for (const attempt of attempts) {
    try {
      const data = await attempt()
      return normalizeOrder(data)
    } catch (error) {
      lastError = error
      const status = (error as AxiosError | undefined)?.response?.status
      if (!status || (status !== 404 && status !== 405)) {
        throw error
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to update order.')
}

export async function getOrders(): Promise<Order[]> {
  const response = await apiClient.get('/drivers/orders')
  const orders = extractOrderList(response.data)
  return orders.map((order) => normalizeOrder(order))
}

export async function acceptOrder(orderId: string): Promise<Order> {
  return updateOrder(orderId, { status: 'Accepted' })
}

export async function arriveOrder(orderId: string): Promise<Order> {
  return updateOrder(orderId, { status: 'Arrived' })
}

export async function completeOrder(orderId: string, signature?: string): Promise<Order> {
  const updates: Record<string, unknown> = { status: 'Completed' }
  if (signature) {
    updates.signature = signature
  }
  return updateOrder(orderId, updates)
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
