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

async function attemptLegacyUpdate(updates, token) {
  try {
    const response = await client.put('/drivers/orders', updates, {
      headers: authHeaders(token),
    })

    return response.data
  } catch (legacyError) {
    if (legacyError.response?.status && [404, 405].includes(legacyError.response.status)) {
      const fallbackResponse = await client.post('/drivers/orders/update', updates, {
        headers: authHeaders(token),
      })

      return fallbackResponse.data
    }

    throw legacyError
  }
}

export async function updateOrder(updates, token) {
  try {
    const response = await client.patch(`/drivers/orders/${updates._id}`, updates, {
      headers: authHeaders(token),
    })

    return response.data
  } catch (primaryError) {
    try {
      return await attemptLegacyUpdate(updates, token)
    } catch (fallbackError) {
      const finalError = fallbackError ?? primaryError
      throw parseError(finalError, 'Unable to update order.')
    }
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

function resolveUploadConfig() {
  const cloudName =
    import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || import.meta.env?.VITE_UPLOAD_CLOUD || 'jasons'
  const uploadPreset =
    import.meta.env?.VITE_CLOUDINARY_PRESET || import.meta.env?.VITE_UPLOAD_PRESET || 'x7c8n8fe'

  return { cloudName, uploadPreset }
}

function extractUploadUrl(result) {
  if (!result) {
    return null
  }

  return result.secure_url || result.url || result.data?.secure_url || result.data?.url || null
}

export async function uploadImage(fileOrDataUrl) {
  const { cloudName, uploadPreset } = resolveUploadConfig()

  if (!cloudName || !uploadPreset) {
    throw new Error('Image uploading is not configured.')
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  const body = new FormData()

  if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
    body.append('file', fileOrDataUrl)
  } else if (typeof fileOrDataUrl === 'string') {
    body.append('file', fileOrDataUrl)
  } else {
    throw new Error('No file selected for upload.')
  }

  body.append('upload_preset', uploadPreset)
  body.append('tags', 'delivery')

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body,
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null)
      const message =
        errorPayload?.error?.message || errorPayload?.message || 'Unable to upload image.'
      throw new Error(message)
    }

    const result = await response.json()
    const url = extractUploadUrl(result)

    if (!url) {
      throw new Error('Upload succeeded but no image URL was returned.')
    }

    return url
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }

    throw new Error('Unable to upload image.')
  }
}

export async function updateDriverProfile(driverId, updates, token) {
  if (!driverId) {
    throw new Error('Driver id is required to update profile.')
  }

  try {
    const response = await client.put(`/drivers/update`, updates, {
      headers: authHeaders(token),
      params: { id: driverId },
    })

    return response.data
  } catch (error) {
    throw parseError(error, 'Unable to update driver profile.')
  }
}

export async function fetchDriverRating(driverId, token) {
  if (!driverId) {
    throw new Error('Driver id is required to fetch rating.')
  }

  try {
    const response = await client.get(`/drivers/totalrating/${driverId}`, {
      headers: authHeaders(token),
    })

    return response.data?.rating ?? response.data
  } catch (error) {
    throw parseError(error, 'Unable to fetch driver rating.')
  }
}
