import { apiClient } from './client'
import type { Driver, DriverStatus } from '../types'

interface LoginResponse {
  token: string
  driver: Driver
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password })
  return data
}

export async function fetchCurrentDriver(): Promise<Driver> {
  const { data } = await apiClient.get<Driver>('/driver/me')
  return data
}

export async function updateDriverStatus(status: DriverStatus): Promise<Driver> {
  const { data } = await apiClient.patch<Driver>('/driver/status', { status })
  return data
}
