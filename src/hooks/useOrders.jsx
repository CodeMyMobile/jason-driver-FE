import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchOrders, updateOrder, updateOrderStatus, uploadImage } from '../services/orderService'
import { useSocket } from './useSocket.jsx'
import { useToast } from './useToast.jsx'
import { useInterval } from './useInterval.ts'
import { useAuth } from './useAuth.jsx'

const OrdersContext = createContext(undefined)

function resolveStage(status) {
  const normalized = (status ?? '').toString().trim().toLowerCase()
  if (['accepted', 'acknowledged'].includes(normalized)) {
    return 'accepted'
  }
  if (
    ['in progress', 'out for delivery', 'out-for-delivery', 'delivering', 'arrived'].includes(
      normalized,
    )
  ) {
    return 'out-for-delivery'
  }
  if (['completed', 'delivered'].includes(normalized)) {
    return 'completed'
  }
  return 'assigned'
}

function coerceDate(value) {
  if (!value) {
    return new Date().toISOString()
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString()
  }
  return parsed.toISOString()
}

function formatAddress(...sources) {
  for (const source of sources) {
    if (!source) continue
    if (typeof source === 'string') {
      const trimmed = source.trim()
      if (trimmed) {
        return trimmed
      }
      continue
    }
    if (typeof source === 'object') {
      const apartment =
        source.apartment ?? source.apartmentNumber ?? source.unit ?? source.suite ?? source.flat
      const description =
        source.description ??
        source.line1 ??
        source.street ??
        source.address1 ??
        source.address ??
        source.formatted ??
        source.formattedAddress
      const line2 = source.line2 ?? source.street2 ?? source.address2 ?? ''
      const city = source.city ?? source.town ?? source.locality ?? ''
      const state = source.state ?? source.region ?? ''
      const postal = source.zip ?? source.postalCode ?? source.postcode ?? ''
      const parts = [
        apartment ? `Apt ${apartment}` : null,
        description,
        line2,
        [city, state, postal].filter(Boolean).join(', '),
      ]
        .filter(Boolean)
        .map((part) => part.trim())
        .filter(Boolean)

      if (parts.length > 0) {
        return parts.join(', ')
      }
    }
  }
  return 'Address unavailable'
}

function extractItems(order) {
  if (!order) return []
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item, index) => ({
      id: String(item._id ?? item.id ?? index),
      name:
        item.name ??
        item.Description ??
        item.title ??
        item.productName ??
        `Item ${index + 1}`,
      quantity: Number(item.quantity ?? item.qty ?? item.count ?? 1) || 1,
    }))
  }

  const products = Array.isArray(order.products) ? order.products : []
  const quantities = Array.isArray(order.qty) ? order.qty : []
  return products.map((product, index) => ({
    id: String(product._id ?? product.id ?? index),
    name: product.Description ?? product.name ?? product.title ?? `Item ${index + 1}`,
    quantity: Number(quantities[index]) || Number(product.quantity ?? 1) || 1,
  }))
}

function normalizeOrder(order) {
  if (!order || typeof order !== 'object') {
    return null
  }
  const idCandidate =
    order._id ??
    order.id ??
    order.orderId ??
    order.orderID ??
    order.reference ??
    order.number ??
    order.uuid
  if (!idCandidate) {
    return null
  }
  const id = String(idCandidate)
  const rawStatus = order.status ?? order.orderStatus ?? order.currentStatus ?? ''
  const stage = resolveStage(rawStatus)
  const owner = order.owner ?? order.customer ?? {}
  const firstName =
    owner?.name?.first ?? owner?.firstName ?? owner?.firstname ?? owner?.first ?? ''
  const lastName = owner?.name?.last ?? owner?.lastName ?? owner?.lastname ?? owner?.last ?? ''
  const combinedName = [firstName, lastName].filter(Boolean).join(' ')
  const fallbackName =
    owner?.name?.full ?? owner?.fullName ?? owner?.name ?? owner?.displayName ?? combinedName
  const name = (fallbackName || 'Customer').trim()
  const phone =
    owner?.phone ?? owner?.phoneNumber ?? order.phone ?? order.customerPhone ?? order.contact ?? ''
  const address = formatAddress(order.address, order.deliveryAddress, order.shippingAddress)
  const number =
    order.orderId ??
    order.number ??
    order.reference ??
    order.shortId ??
    (typeof id === 'string' && id.length >= 6 ? id.slice(-6).toUpperCase() : id)
  const total = Number(
    order.total ?? order.totalAmount ?? order.orderTotal ?? order.amount ?? order.paymentTotal ?? 0,
  )
  const createdAt = coerceDate(order.createdAt ?? order.created_at ?? order.updatedAt)
  const assignedDriverId =
    order.assignedDriverId ??
    order.driverId ??
    order.driver_id ??
    order.driver?.id ??
    order.driver?._id ??
    undefined

  return {
    id,
    number: String(number),
    total: Number.isFinite(total) ? total : 0,
    status: stage,
    rawStatus: rawStatus ?? '',
    createdAt,
    customer: {
      name,
      phone: phone ?? '',
      address,
    },
    priority: Boolean(order.priority || order.isPriority || order.priorityOrder),
    items: extractItems(order),
    assignedDriverId,
  }
}

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([])
  const [isFetching, setIsFetching] = useState(false)
  const { subscribe } = useSocket()
  const { push } = useToast()
  const { token } = useAuth()

  const mergeOrder = useCallback((next) => {
    const normalized = normalizeOrder(next)
    if (!normalized) {
      return
    }
    setOrders((current) => {
      const existing = current.find((order) => order.id === normalized.id)
      if (existing) {
        return current.map((order) =>
          order.id === normalized.id ? { ...existing, ...normalized } : order,
        )
      }
      return [normalized, ...current]
    })
  }, [])

  const refresh = useCallback(async () => {
    if (!token) {
      setOrders([])
      return
    }
    setIsFetching(true)
    try {
      const data = await fetchOrders(token)
      setOrders(data.map((order) => normalizeOrder(order)).filter(Boolean))
    } catch (error) {
      console.error('Failed to load orders', error)
    } finally {
      setIsFetching(false)
    }
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  useInterval(refresh, 15000)

  useEffect(() => {
    const unsubCreated = subscribe('ORDER_CREATED', (payload) => {
      mergeOrder(payload)
      const normalized = normalizeOrder(payload)
      if (normalized?.number) {
        push({ title: 'New delivery assigned', description: normalized.number, variant: 'info' })
      }
    })
    const unsubUpdated = subscribe('ORDER_UPDATED', (payload) => {
      mergeOrder(payload)
    })
    return () => {
      unsubCreated()
      unsubUpdated()
    }
  }, [mergeOrder, push, subscribe])

  const accept = useCallback(
    async (orderId) => {
      if (!token) {
        push({
          title: 'Unable to accept order',
          description: 'Authentication required.',
          variant: 'error',
        })
        return false
      }
      try {
        await updateOrderStatus(orderId, 'Accepted', token)
        push({ title: 'Order accepted', description: 'Order moved to Accepted.', variant: 'success' })
        await refresh()
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to accept order.'
        push({ title: 'Unable to accept order', description: message, variant: 'error' })
        return false
      }
    },
    [push, refresh, token],
  )

  const markArrived = useCallback(
    async (orderId) => {
      if (!token) {
        push({
          title: 'Unable to update order',
          description: 'Authentication required.',
          variant: 'error',
        })
        return false
      }
      try {
        await updateOrderStatus(orderId, 'In Progress', token)
        push({
          title: 'Customer arrival logged',
          description: 'Order is now out for delivery.',
          variant: 'info',
        })
        await refresh()
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update order.'
        push({ title: 'Unable to update order', description: message, variant: 'error' })
        return false
      }
    },
    [push, refresh, token],
  )

  const markComplete = useCallback(
    async (orderId, signature) => {
      if (!token) {
        push({
          title: 'Unable to complete order',
          description: 'Authentication required.',
          variant: 'error',
        })
        return false
      }
      try {
        let signatureUrl = signature ?? undefined
        if (signature && typeof signature === 'string' && signature.startsWith('data:')) {
          signatureUrl = await uploadImage(signature)
        }
        const payload = {
          _id: orderId,
          status: 'Completed',
        }
        if (signatureUrl) {
          payload.signature = signatureUrl
        }
        await updateOrder(payload, token)
        push({
          title: 'Delivery completed',
          description: 'Order marked as delivered.',
          variant: 'success',
        })
        await refresh()
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to complete order.'
        push({ title: 'Unable to complete order', description: message, variant: 'error' })
        return false
      }
    },
    [push, refresh, token],
  )

  const value = useMemo(
    () => ({ orders, refresh, accept, markArrived, markComplete, isFetching }),
    [accept, isFetching, markArrived, markComplete, orders, refresh],
  )

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) {
    throw new Error('useOrders must be used within OrdersProvider')
  }
  return context
}
