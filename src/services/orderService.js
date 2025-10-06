import axios from 'axios'
import urls from './urlServices'

const client = axios.create({
  baseURL: urls.api,
  headers: {
    'Content-Type': 'application/json',
  },
})

function authHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {}
}

function parseError(error, fallbackMessage) {
  if (error.response?.data?.message) {
    return new Error(error.response.data.message)
  }

  if (error.response?.data?.error) {
    return new Error(error.response.data.error)
  }

  return new Error(error.message || fallbackMessage)
}

export async function fetchOrders(token) {
  try {
    const response = await client.get('/drivers/orders', {
      headers: authHeaders(token),
    })

    if (Array.isArray(response.data)) {
      return response.data
    }

    if (Array.isArray(response.data?.orders)) {
      return response.data.orders
    }

    return response.data?.data ?? []
  } catch (error) {
    throw parseError(error, 'Unable to load orders.')
  }
}

export async function fetchOrderById(orderId, token) {
  try {
    const response = await client.get(`/drivers/orders/${orderId}`, {
      headers: authHeaders(token),
    })

    return response.data?.order ?? response.data
  } catch (error) {
    if (error.response?.status === 404) {
      const allOrders = await fetchOrders(token)
      return allOrders.find((order) => order._id === orderId) ?? null
    }

    throw parseError(error, 'Unable to load order details.')
  }
}

export async function updateOrder(updates, token) {
  try {
    const response = await client.patch(`/drivers/orders/${updates._id}`, updates, {
      headers: authHeaders(token),
    })

    return response.data
  } catch (error) {
    if (error.response?.status && [404, 405].includes(error.response.status)) {
      try {
        const fallbackResponse = await client.post('/drivers/orders/update', updates, {
          headers: authHeaders(token),
        })

        return fallbackResponse.data
      } catch (fallbackError) {
        throw parseError(fallbackError, 'Unable to update order.')
      }
    }

    throw parseError(error, 'Unable to update order.')
  }
}

export async function updateOrderStatus(orderId, status, token) {
  return updateOrder(
    {
      _id: orderId,
      status,
    },
    token,
  )
}

export async function fetchCardUses(cardReference, token) {
  if (!cardReference) {
    return 0
  }

  try {
    const response = await client.get(`/drivers/cards/${cardReference}/uses`, {
      headers: authHeaders(token),
    })

    return response.data?.uses ?? response.data?.data ?? response.data ?? 0
  } catch (error) {
    throw parseError(error, 'Unable to fetch card usage information.')
  }
}

export async function fetchCardDetails(stripeCustomerId, cardReference, token) {
  if (!stripeCustomerId || !cardReference) {
    return null
  }

  try {
    const response = await client.get(
      `/drivers/customers/${stripeCustomerId}/cards/${cardReference}`,
      {
        headers: authHeaders(token),
      },
    )

    return response.data?.card ?? response.data
  } catch (error) {
    throw parseError(error, 'Unable to fetch card details.')
  }
}

export async function sendArrivalMessage(payload, token) {
  try {
    const response = await client.post('/drivers/orders/send-arrival-message', payload, {
      headers: authHeaders(token),
    })

    return response.data
  } catch (error) {
    throw parseError(error, 'Unable to send arrival message.')
  }
}
