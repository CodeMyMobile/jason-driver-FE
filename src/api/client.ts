import axios from 'axios'

const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || {}
const nodeEnv = typeof process !== 'undefined' ? process.env : {}
const baseURL =
  viteEnv.VITE_CMS_BASE_URL || nodeEnv?.VITE_CMS_BASE_URL || 'http://localhost:4310'

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('jdl:token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function setAuthToken(token: string | null) {
  if (token) {
    sessionStorage.setItem('jdl:token', token)
  } else {
    sessionStorage.removeItem('jdl:token')
  }
}

export function getBaseUrl() {
  return baseURL
}
