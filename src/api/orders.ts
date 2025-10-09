import { AxiosError } from 'axios'
import { apiClient } from './client'
import { Customer, Order, OrderItem, OrderStatus } from '../types'

type RawOrder = Record<string, unknown>

const INVALID_PATH_STORAGE_KEY = 'jason-driver-invalid-order-paths'

const invalidOrderPaths: Set<string> = (() => {
  if (typeof window === 'undefined') {
    return new Set<string>()
  }

  try {
    const stored = window.sessionStorage.getItem(INVALID_PATH_STORAGE_KEY)
    if (!stored) {
      return new Set<string>()
    }
    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) {
      return new Set<string>()
    }
    return new Set(parsed.filter((value) => typeof value === 'string') as string[])
  } catch (error) {
    console.warn('Failed to restore invalid order paths', error)
    return new Set<string>()
  }
})()

function persistInvalidPaths() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const serialized = JSON.stringify(Array.from(invalidOrderPaths))
    window.sessionStorage.setItem(INVALID_PATH_STORAGE_KEY, serialized)
  } catch (error) {
    console.warn('Failed to persist invalid order paths', error)
  }
}

function markPathInvalid(path: string) {
  if (invalidOrderPaths.has(path)) {
    return
  }
  invalidOrderPaths.add(path)
  persistInvalidPaths()
}

function canAttemptPath(path: string): boolean {
  return !invalidOrderPaths.has(path)
}

function getSessionDriverId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  try {
    const stored = window.sessionStorage.getItem('jason-driver-profile')
    if (!stored) {
      return undefined
    }
    const parsed = JSON.parse(stored) as Record<string, unknown>
    const idCandidate =
      parsed.id ??
      parsed._id ??
      parsed.driverId ??
      parsed.driver_id ??
      parsed.driverID ??
      parsed.uuid ??
      parsed.guid
    if (typeof idCandidate === 'string' && idCandidate.trim()) {
      return idCandidate.trim()
    }
    if (typeof idCandidate === 'number' && Number.isFinite(idCandidate)) {
      return String(idCandidate)
    }
    return undefined
  } catch (error) {
    console.warn('Failed to read stored driver id', error)
    return undefined
  }
}

function normalizeOrderStatus(rawStatus: unknown): OrderStatus {
  if (typeof rawStatus !== 'string') {
    return 'NEW'
  }
  const normalized = rawStatus.trim().toLowerCase()
  if (!normalized) return 'NEW'

  if (normalized.includes('cancel')) {
    return 'CANCELLED'
  }
  if (normalized.includes('out') && normalized.includes('delivery')) {
    return 'IN_PROGRESS'
  }
  if (
    normalized.includes('complete') ||
    normalized.includes('delivered') ||
    normalized.includes('finished') ||
    normalized.includes('finish') ||
    normalized.includes('done') ||
    normalized.includes('fulfill') ||
    normalized.includes('close')
  ) {
    return 'COMPLETED'
  }
  if (normalized.includes('arriv')) {
    return 'ARRIVED'
  }
  if (
    normalized.includes('progress') ||
    normalized.includes('accept') ||
    normalized.includes('active') ||
    normalized.includes('deliver') ||
    normalized.includes('enroute') ||
    normalized.includes('en_route')
  ) {
    return 'IN_PROGRESS'
  }
  if (
    normalized.includes('assign') ||
    normalized.includes('pending') ||
    normalized.includes('new') ||
    normalized.includes('ready')
  ) {
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

function toStringId(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}

function extractDriverIdValue(value: unknown): string | undefined {
  if (!value) {
    return undefined
  }
  const direct = toStringId(value)
  if (direct) {
    return direct
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const nestedId = extractDriverIdValue(entry)
      if (nestedId) {
        return nestedId
      }
    }
    return undefined
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const directKeys = [
      'id',
      '_id',
      'driverId',
      'driver_id',
      'driverID',
      'uuid',
      'guid',
      'completedById',
      'completed_by_id',
      'completedDriverId',
      'completed_driver_id',
      'completedByDriverId',
      'completed_by_driver_id',
      'deliveredById',
      'delivered_by_id',
      'deliveryDriverId',
      'delivery_driver_id',
    ]
    for (const key of directKeys) {
      const candidate = record[key]
      const stringId = toStringId(candidate)
      if (stringId) {
        return stringId
      }
    }
    const nestedKeys = [
      'driver',
      'driverInfo',
      'driver_info',
      'assignedDriver',
      'assigned_driver',
      'assignedTo',
      'assigned_to',
      'assignee',
      'completedBy',
      'completed_by',
      'completion',
      'deliveredBy',
      'delivered_by',
      'deliveryDriver',
      'delivery_driver',
      'delivery',
      'deliveryInfo',
      'delivery_info',
      'deliveryDetails',
      'delivery_details',
      'fulfillment',
      'fulfillmentInfo',
      'fulfillment_info',
      'user',
      'data',
      'details',
      'profile',
      'info',
      'attributes',
      'meta',
      'metadata',
      'history',
      'record',
      'records',
      'result',
      'results',
      'payload',
    ]
    for (const key of nestedKeys) {
      const nested = record[key]
      const stringId = extractDriverIdValue(nested)
      if (stringId) {
        return stringId
      }
    }
    return undefined
  }
  return undefined
}

function extractDriverId(data: RawOrder): string | undefined {
  const record = data as Record<string, unknown>
  const keys = [
    'assignedDriverId',
    'assigned_driver_id',
    'driverId',
    'driver_id',
    'driverID',
    'driverUuid',
    'driver_uuid',
    'assignedDriver',
    'assigned_driver',
    'assignedTo',
    'assigned_to',
    'assignee',
    'completedById',
    'completed_by_id',
    'completedDriverId',
    'completed_driver_id',
    'completedByDriverId',
    'completed_by_driver_id',
    'completedBy',
    'completed_by',
    'completion',
    'deliveredBy',
    'delivered_by',
    'deliveredById',
    'delivered_by_id',
    'deliveryDriver',
    'delivery_driver',
    'deliveryDriverId',
    'delivery_driver_id',
    'delivery',
    'fulfillment',
    'history',
    'record',
    'records',
    'result',
    'results',
    'payload',
    'driver',
  ]

  for (const key of keys) {
    const candidate = extractDriverIdValue(record[key])
    if (candidate) {
      return candidate
    }
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
    data.timestamp ??
    data.completedAt ??
    data.completed_at ??
    data.deliveredAt ??
    data.delivered_at ??
    data.finishedAt ??
    data.finished_at
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

function isOrderLike(value: unknown): value is RawOrder {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Record<string, unknown>
  if ('status' in record || 'orderStatus' in record || 'order_status' in record) {
    return true
  }
  if (
    'id' in record ||
    '_id' in record ||
    'orderId' in record ||
    'order_id' in record ||
    'uuid' in record ||
    'guid' in record ||
    'reference' in record ||
    'referenceId' in record ||
    'reference_id' in record
  ) {
    return true
  }
  return false
}

function extractOrderList(payload: any): RawOrder[] {
  const results: RawOrder[] = []
  const seenNodes = new Set<any>()
  const queue: Array<{ node: any; depth: number }> = [{ node: payload, depth: 0 }]

  const maxDepth = 4

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!
    if (node == null) {
      continue
    }
    if (seenNodes.has(node)) {
      continue
    }
    seenNodes.add(node)

    if (Array.isArray(node)) {
      const orderItems = node.filter(isOrderLike)
      if (orderItems.length > 0) {
        for (const item of orderItems) {
          results.push(item)
        }
        continue
      }

      if (depth < maxDepth) {
        for (const entry of node) {
          queue.push({ node: entry, depth: depth + 1 })
        }
      }
      continue
    }

    if (typeof node === 'object') {
      const values = Object.values(node as Record<string, unknown>)
      for (const value of values) {
        if (value == null) {
          continue
        }
        if (Array.isArray(value) || (typeof value === 'object' && depth < maxDepth)) {
          queue.push({ node: value, depth: depth + 1 })
        }
      }
    }
  }

  const deduped = new Map<string, RawOrder>()
  for (const raw of results) {
    const id = extractOrderId(raw)
    if (deduped.has(id)) {
      deduped.set(id, { ...deduped.get(id), ...raw })
    } else {
      deduped.set(id, raw)
    }
  }

  return Array.from(deduped.values())
}

async function updateOrder(orderId: string, updates: Record<string, unknown>): Promise<Order> {
  const body = { ...updates, _id: orderId }
  let lastError: unknown

  const attempts: Array<() => Promise<RawOrder>> = [
    async () => {
      const response = await apiClient.patch<RawOrder>(`/driver/orders/${orderId}`, body)
      return response.data
    },
    async () => {
      const response = await apiClient.patch<RawOrder>(`/drivers/orders/${orderId}`, body)
      return response.data
    },
    async () => {
      const response = await apiClient.put<RawOrder>('/driver/orders', body)
      return response.data
    },
    async () => {
      const response = await apiClient.put<RawOrder>('/drivers/orders', body)
      return response.data
    },
    async () => {
      const response = await apiClient.post<RawOrder>('/driver/orders/update', body)
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

function isNotFound(error: unknown): boolean {
  return (error as AxiosError | undefined)?.response?.status === 404
}

function isMethodNotAllowed(error: unknown): boolean {
  return (error as AxiosError | undefined)?.response?.status === 405
}

function mergeNormalizedOrders(existing: Order, incoming: Order): Order {
  const merged: Order = { ...existing }
  for (const [key, value] of Object.entries(incoming) as [keyof Order, Order[keyof Order]][]) {
    if (value === undefined || value === null) {
      continue
    }
    if (Array.isArray(value)) {
      const currentValue = merged[key]
      if (Array.isArray(currentValue) && currentValue.length > 0 && value.length === 0) {
        continue
      }
    }
    merged[key] = value
  }
  return merged
}

export async function getOrders(): Promise<Order[]> {
  const collected = new Map<string, Order>()
  const driverId = getSessionDriverId()

  const upsert = (rawOrders: RawOrder[]) => {
    for (const raw of rawOrders) {
      const normalized = normalizeOrder(raw)
      const existing = collected.get(normalized.id)
      if (existing) {
        collected.set(normalized.id, mergeNormalizedOrders(existing, normalized))
      } else {
        collected.set(normalized.id, normalized)
      }
    }
  }

  const primaryPaths = ['/drivers/orders', '/driver/orders']
  let resolvedBasePath: string | undefined

  for (const path of primaryPaths) {
    if (!canAttemptPath(path)) {
      continue
    }

    try {
      const response = await apiClient.get<unknown>(path)
      const orders = extractOrderList(response.data)
      if (orders.length > 0) {
        upsert(orders)
      }
      resolvedBasePath = path
      break
    } catch (error) {
      if (isNotFound(error) || isMethodNotAllowed(error)) {
        markPathInvalid(path)
        continue
      }
      throw error
    }
  }

  const completedPaths: string[] = []
  if (resolvedBasePath) {
    const encodedDriverId = driverId ? encodeURIComponent(driverId) : undefined
    if (encodedDriverId) {
      completedPaths.push(`${resolvedBasePath}?status=Completed&driverId=${encodedDriverId}`)
    }
    completedPaths.push(`${resolvedBasePath}?status=Completed`)
    completedPaths.push(`${resolvedBasePath}/history`)
    if (encodedDriverId) {
      completedPaths.push(`${resolvedBasePath}/history?driverId=${encodedDriverId}`)
    }
  }

  for (const path of completedPaths) {
    if (!canAttemptPath(path)) {
      continue
    }

    try {
      const response = await apiClient.get<unknown>(path)
      const orders = extractOrderList(response.data)
      if (orders.length === 0) {
        continue
      }
      upsert(orders)
      break
    } catch (error) {
      if (isNotFound(error) || isMethodNotAllowed(error)) {
        markPathInvalid(path)
        continue
      }
      throw error
    }
  }

  return Array.from(collected.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
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
