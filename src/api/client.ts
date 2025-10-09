import axios from 'axios'

function sanitizeBaseUrl(raw?: string): string {
  if (!raw) return 'https://api.jasonsliquor.com'
  const trimmed = raw.trim()
  if (!trimmed) return 'https://api.jasonsliquor.com'
  return trimmed.replace(/\/+$/, '')
}

const sanitized = sanitizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
const baseURL = sanitized.endsWith('/api') ? sanitized : `${sanitized}/api`

export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API error', error.response.status, error.response.data)
    } else {
      console.error('API error', error)
    }
    return Promise.reject(error)
  },
)
