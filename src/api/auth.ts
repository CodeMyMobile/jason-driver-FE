import { AxiosError } from 'axios'
import { apiClient } from './client'
import { AuthResponse, Driver, DriverStatus } from '../types'

interface LoginPayload {
  email: string
  password: string
}

function normalizeDriverStatus(value: unknown): DriverStatus {
  if (typeof value !== 'string') {
    return 'OFFLINE'
  }
  const normalized = value.trim().toUpperCase().replace(/[-\s]+/g, '_')
  switch (normalized) {
    case 'ONLINE':
    case 'ACTIVE':
      return 'ONLINE'
    case 'ON_DELIVERY':
    case 'ON_DELIVERIES':
    case 'DELIVERING':
      return 'ON_DELIVERY'
    case 'OFFLINE':
    default:
      return 'OFFLINE'
  }
}

function formatDriverName(raw: any): string {
  if (!raw) return 'Driver'
  if (typeof raw.name === 'string' && raw.name.trim()) {
    return raw.name.trim()
  }
  const first = raw.firstName ?? raw.first_name ?? raw.name?.first ?? raw.givenName
  const last = raw.lastName ?? raw.last_name ?? raw.name?.last ?? raw.familyName
  const combined = [first, last].filter(Boolean).join(' ').trim()
  if (combined) {
    return combined
  }
  if (typeof raw.fullName === 'string' && raw.fullName.trim()) {
    return raw.fullName.trim()
  }
  return typeof raw.email === 'string' && raw.email ? raw.email : 'Driver'
}

function extractPhone(raw: any): string {
  const phone = raw?.phone ?? raw?.phoneNumber ?? raw?.phone_number ?? raw?.contactNumber
  if (typeof phone === 'string') {
    return phone
  }
  return ''
}

function extractDriver(data: any): Driver {
  const source = data?.driver ?? data?.user ?? data
  const id =
    source?.id ??
    source?._id ??
    source?.driverId ??
    source?.driver_id ??
    source?.uuid ??
    source?.guid ??
    ''
  const email = source?.email ?? ''
  return {
    id: String(id || email || `driver-${Date.now()}`),
    name: formatDriverName(source),
    phone: extractPhone(source),
    email,
    status: normalizeDriverStatus(source?.status),
  }
}

function isNotFound(error: unknown): boolean {
  return Boolean((error as AxiosError)?.response?.status === 404)
}

function isMethodNotAllowed(error: unknown): boolean {
  return Boolean((error as AxiosError)?.response?.status === 405)
}

function getStoredDriver(): Driver | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  try {
    const stored = sessionStorage.getItem('jason-driver-profile')
    if (!stored) return undefined
    const parsed = JSON.parse(stored) as Partial<Driver> & { _id?: string }
    return extractDriver(parsed)
  } catch (error) {
    console.warn('Failed to read stored driver', error)
    return undefined
  }
}

function getStoredDriverId(): string | undefined {
  return getStoredDriver()?.id
}

async function fetchDriverProfile(path: string): Promise<Driver> {
  const response = await apiClient.get(path)
  return extractDriver(response.data)
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiClient.post('/drivers/login', payload)
  const { token } = response.data ?? {}
  const driver = extractDriver(response.data)
  if (!token || !driver) {
    throw new Error('Invalid login response from server.')
  }
  return { token, driver }
}

export async function getCurrentDriver(): Promise<Driver> {
  let lastNotFoundError: unknown
  try {
    return await fetchDriverProfile('/drivers/me')
  } catch (error) {
    if (!(isNotFound(error) || isMethodNotAllowed(error))) {
      throw error
    }
    lastNotFoundError = error
  }

  const fallbackDriver = getStoredDriver()
  const storedId = fallbackDriver?.id
  if (storedId) {
    try {
      const response = await apiClient.get(`/drivers/${storedId}`)
      return extractDriver(response.data)
    } catch (error) {
      if (!(isNotFound(error) || isMethodNotAllowed(error))) {
        throw error
      }
      lastNotFoundError = error
    }
  }

  if (fallbackDriver) {
    return fallbackDriver
  }

  if (lastNotFoundError) {
    throw lastNotFoundError instanceof Error
      ? lastNotFoundError
      : new Error('Unable to locate driver profile.')
  }

  throw new Error('Missing driver reference for profile lookup.')
}

// Driver status updates are intentionally omitted in the refreshed UI.
