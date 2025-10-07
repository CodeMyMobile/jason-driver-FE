import axios from 'axios'
import type { AxiosError } from 'axios'

const envBase =
  (typeof import.meta.env.VITE_CMS_BASE_URL === 'string' &&
    import.meta.env.VITE_CMS_BASE_URL.trim()) ||
  (typeof import.meta.env.VITE_API_BASE_URL === 'string' &&
    import.meta.env.VITE_API_BASE_URL.trim())

const baseURL = (envBase || 'https://api.jasonsliquor.com').replace(/\/+$/, '')

export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = extractErrorMessage(error)
    console.error('API error:', message)
    if (error) {
      console.error(error)
    }
    return Promise.reject(error)
  },
)

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; errors?: string[] } | string>
    const { response, message } = axiosError

    if (!response) {
      return 'Unable to reach the server. Please check your connection and try again.'
    }

    const { data, status } = response

    if (typeof data === 'string' && data.trim().length > 0) {
      return data
    }

    if (data && typeof data === 'object') {
      const detailedMessage = data.message ?? data.error ?? data.errors?.join(', ')
      if (detailedMessage) {
        return detailedMessage
      }
    }

    if (message) {
      return message
    }

    return `Request failed with status ${status}`
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong while communicating with the server.'
}

export async function safeRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request()
  } catch (error) {
    const message = extractErrorMessage(error)
    console.error('API request failed:', message)
    if (error) {
      console.error(error)
    }
    throw new Error(message)
  }
}
