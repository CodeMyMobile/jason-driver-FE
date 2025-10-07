import { DriverOrder, DriverOrderItem } from '../types'

function ensureString(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }
  if (value === undefined || value === null) {
    return fallback
  }
  const stringified = String(value)
  return stringified.trim().length > 0 ? stringified : fallback
}

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
    return value
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString()
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return undefined
}

function normalizeStatus(value: unknown): DriverOrder['status'] {
  if (!value) return 'ASSIGNED'
  const raw = ensureString(value).replace(/\s+/g, '_').replace(/-/g, '_').toUpperCase()
  switch (raw) {
    case 'ASSIGNED':
    case 'NEW':
    case 'IN_PROGRESS':
    case 'ARRIVED':
    case 'COMPLETED':
    case 'CANCELLED':
      return raw as DriverOrder['status']
    case 'ACCEPTED':
    case 'ON_THE_WAY':
    case 'EN_ROUTE':
      return 'IN_PROGRESS'
    default:
      return 'ASSIGNED'
  }
}

function buildName(source: unknown): string {
  if (!source || typeof source !== 'object') return 'Customer'
  const record = source as Record<string, unknown>
  const first = ensureString(record.firstName ?? record.first ?? '', '')
  const last = ensureString(record.lastName ?? record.last ?? '', '')
  const full = [first, last].filter(Boolean).join(' ')
  if (full) return full
  if (typeof record.name === 'string' && record.name.trim()) return record.name
  if (typeof record.fullName === 'string' && record.fullName.trim()) return record.fullName
  if (typeof record.email === 'string' && record.email.trim()) {
    return record.email.split('@')[0]
  }
  return 'Customer'
}

function buildPhone(source: unknown): string | undefined {
  if (!source || typeof source !== 'object') return undefined
  const record = source as Record<string, unknown>
  const contact = record.contact as Record<string, unknown> | undefined
  const value =
    record.phone ??
    record.phoneNumber ??
    record.mobile ??
    record.contactNumber ??
    record.primaryPhone ??
    contact?.phone ??
    contact?.phoneNumber
  if (!value) return undefined
  return ensureString(value)
}

function buildAddress(source: unknown, fallback?: unknown): {
  address: string
  lat?: number
  lng?: number
} {
  let lat: number | undefined
  let lng: number | undefined

  const collectParts = (input: unknown): string[] => {
    if (!input) return []
    if (typeof input === 'string') return [input]
    if (Array.isArray(input)) {
      return input.flatMap((item) => collectParts(item))
    }
    if (typeof input === 'object') {
      const record = input as Record<string, unknown>
      if (Array.isArray(record.loc) && record.loc.length >= 2) {
        const [rawLng, rawLat] = record.loc as [unknown, unknown]
        lat = typeof rawLat === 'number' ? rawLat : lat
        lng = typeof rawLng === 'number' ? rawLng : lng
      }
      if (typeof record.latitude === 'number') lat = record.latitude
      if (typeof record.longitude === 'number') lng = record.longitude
      if (typeof record.lat === 'number') lat = record.lat
      if (typeof record.lng === 'number') lng = record.lng
      const coordinates = record.coordinates as Record<string, unknown> | undefined
      if (coordinates) {
        if (typeof coordinates.lat === 'number') lat = coordinates.lat
        if (typeof coordinates.lng === 'number') lng = coordinates.lng
        if (Array.isArray(coordinates.values) && coordinates.values.length >= 2) {
          const [rawLng, rawLat] = coordinates.values as [unknown, unknown]
          lat = typeof rawLat === 'number' ? rawLat : lat
          lng = typeof rawLng === 'number' ? rawLng : lng
        }
      }
      const addressFields = [
        record.address,
        record.line1,
        record.line2,
        record.street,
        record.street1,
        record.street2,
        record.city,
        record.state,
        record.postalCode,
        record.zip,
        record.country,
        record.description,
        record.formatted,
      ]
      return addressFields.flatMap((value) => collectParts(value))
    }
    return []
  }

  const parts = collectParts(source)
  if (parts.length === 0 && fallback) {
    parts.push(...collectParts(fallback))
  }

  const address = parts
    .map((part) => ensureString(part))
    .filter((part) => part.length > 0)
    .filter((part, index, array) => array.indexOf(part) === index)
    .join(', ')

  return {
    address: address || 'Customer location pending',
    lat,
    lng,
  }
}

function buildItems(source: unknown): DriverOrderItem[] {
  const rawItems: unknown[] = []
  if (!source || typeof source !== 'object') return []
  const record = source as Record<string, unknown>
  if (Array.isArray(record.items)) {
    rawItems.push(...(record.items as unknown[]))
  }
  if (Array.isArray(record.products)) {
    rawItems.push(...(record.products as unknown[]))
  }
  if (Array.isArray(record.orderItems)) {
    rawItems.push(...(record.orderItems as unknown[]))
  }

  if (rawItems.length === 0) return []

  return rawItems.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return { id: `item-${index}`, name: ensureString(item, 'Item'), quantity: 1 }
    }
    const record = item as Record<string, unknown>
    const product = record.product as Record<string, unknown> | undefined
    const name = ensureString(
      record.name ??
        record.title ??
        record.description ??
        record.productName ??
        product?.name ??
        `Item ${index + 1}`,
    )
    const quantityRaw =
      record.quantity ??
      record.qty ??
      record.count ??
      record.amount ??
      record.units ??
      product?.quantity
    const quantity = Number(quantityRaw ?? 1)
    return {
      id: ensureString(record.id ?? record._id ?? `${index}`),
      name,
      quantity: Number.isNaN(quantity) ? 1 : Math.max(1, Math.round(quantity)),
    }
  })
}

export function adaptOrder(source: unknown): DriverOrder {
  const record = (source ?? {}) as Record<string, unknown>
  const generatedId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const id = ensureString(record._id ?? record.id ?? record.orderId ?? generatedId)
  const number = ensureString(record.orderNumber ?? record.number ?? record.reference ?? record.code ?? id, id)
  const status = normalizeStatus(record.status ?? record.state ?? record.stage)
  const createdAt =
    toIsoString(record.createdAt ?? record.created_at ?? record.createdOn ?? record.created ?? record.createdDate) ??
    new Date().toISOString()
  const timestamps = record.timestamps as Record<string, unknown> | undefined
  const timeline = record.timeline as Record<string, unknown> | undefined
  const progress = record.progress as Record<string, unknown> | undefined
  const meta = record.meta as Record<string, unknown> | undefined
  const acceptedAt =
    toIsoString(
      record.acceptedAt ??
        record.accepted_at ??
        record.acceptedOn ??
        timestamps?.accepted ??
        timeline?.acceptedAt ??
        progress?.acceptedAt ??
        meta?.acceptedAt,
    ) ?? undefined
  const completedAt =
    toIsoString(
      record.completedAt ??
        record.completed_at ??
        record.completedOn ??
        timestamps?.completed ??
        timeline?.completedAt ??
        progress?.completedAt ??
        meta?.completedAt,
    ) ?? undefined
  const startedAt =
    toIsoString(
      record.startedAt ??
        record.started_at ??
        record.startedOn ??
        record.inProgressAt ??
        timestamps?.started ??
        timeline?.startedAt ??
        timeline?.inProgressAt ??
        progress?.startedAt ??
        meta?.startedAt,
    ) ?? undefined
  const arrivedAt =
    toIsoString(
      record.arrivedAt ??
        record.arrived_at ??
        record.arrivedOn ??
        record.atCustomerAt ??
        timestamps?.arrived ??
        timeline?.arrivedAt ??
        progress?.arrivedAt ??
        meta?.arrivedAt,
    ) ?? undefined
  const assignedDriverIdRaw =
    record.assignedDriverId ??
    record.assignedDriver?.id ??
    record.assignedDriver?._id ??
    record.driverId ??
    record.driver?._id ??
    record.driver?.id
  const assignedDriverId = assignedDriverIdRaw ? ensureString(assignedDriverIdRaw) : undefined
  const customerSource =
    (record.customer ?? record.owner ?? record.recipient ?? record.user ?? {}) as Record<string, unknown>
  const customerAddress =
    customerSource.address ??
    record.address ??
    record.deliveryAddress ??
    record.shippingAddress
  const { address, lat, lng } = buildAddress(customerAddress, record.addressLine)

  const requiresIdCheck = Boolean(
    record.requiresIdVerification ??
      record.requiresIdCheck ??
      record.requireIdCheck ??
      record.idVerificationRequired ??
      record.ageRestricted ??
      (customerSource.requiresVerification as boolean | undefined),
  )

  const paymentRecord = record.payment as Record<string, unknown> | undefined
  const paymentStatus = ensureString(record.paymentStatus ?? paymentRecord?.status ?? '', '').toUpperCase()
  const requiresPaymentCheck = Boolean(
    record.requiresPaymentVerification ??
      record.requiresPaymentCheck ??
      record.requirePaymentCheck ??
      (paymentStatus ? paymentStatus === 'PENDING' : undefined) ??
      record.paymentDue,
  )

  const summaryRecord = record.summary as Record<string, unknown> | undefined
  const totalRaw =
    record.total ??
    record.orderTotal ??
    summaryRecord?.total ??
    record.amount ??
    paymentRecord?.total ??
    record.grandTotal
  const total = Number(totalRaw ?? 0)
  const normalizedTotal = Number.isFinite(total) ? total : 0

  const notes = ensureString(
    record.deliveryNote ??
      record.notes ??
      record.instructions ??
      record.customerNotes ??
      record.specialInstructions ??
      '',
    '',
  )

  return {
    id,
    number,
    status,
    createdAt,
    acceptedAt,
    startedAt,
    arrivedAt,
    completedAt,
    assignedDriverId,
    requiresIdCheck,
    requiresPaymentCheck,
    total: normalizedTotal,
    customer: {
      name: buildName(customerSource),
      phone: buildPhone(customerSource),
      address,
      lat,
      lng,
    },
    priority: Boolean(record.priority ?? record.isPriority ?? record.rush ?? record.expedited),
    items: buildItems(record),
    notes: notes || undefined,
  }
}

export function adaptOrders(sources: unknown[]): DriverOrder[] {
  return sources.map((source) => adaptOrder(source))
}
