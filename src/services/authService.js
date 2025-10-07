import axios from 'axios'
import urls from './urlServices'

const client = axios.create({
  baseURL: urls.api,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function logIn(email, password) {
  try {
    const response = await client.post('/drivers/login', {
      email,
      password,
    })

    if (!response.data || response.data.error) {
      const message = response.data?.error || 'Unable to login. Please try again.'
      throw new Error(message)
    }

    return response.data
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }

    if (error.response?.data?.error) {
      throw new Error(error.response.data.error)
    }

    throw new Error(error.message || 'Unable to login. Please try again.')
  }
}

export async function updateDriverProfile(driverId, payload, token) {
  try {
    const response = await client.patch(`/drivers/${driverId}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.data
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Unable to update driver profile.'

    throw new Error(message)
  }
}

export async function fetchOverallRating(driverId, token) {
  try {
    const response = await client.get(`/drivers/${driverId}/overall-rating`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.data
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Unable to load driver rating.'

    throw new Error(message)
  }
}
