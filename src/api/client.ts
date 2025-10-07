import axios from 'axios'

const baseURL = import.meta.env.VITE_CMS_BASE_URL ?? 'http://localhost:4000'

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

export async function safeRequest<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request()
  } catch (error) {
    console.error('API request failed', error)
    throw error
  }
}
