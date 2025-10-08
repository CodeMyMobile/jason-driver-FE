import { apiClient, safeRequest } from './client'
import { AuthResponse, DriverStatus } from '../types'

interface LoginPayload {
  email: string
  password: string
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return safeRequest(async () => {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload)
    return response.data
  })
}

export async function getCurrentDriver(): Promise<AuthResponse['driver']> {
  return safeRequest(async () => {
    const response = await apiClient.get<AuthResponse['driver']>('/driver/me')
    return response.data
  })
}

export async function updateDriverStatus(status: DriverStatus): Promise<AuthResponse['driver']> {
  return safeRequest(async () => {
    const response = await apiClient.patch<AuthResponse['driver']>('/driver/status', { status })
    return response.data
  })
}
