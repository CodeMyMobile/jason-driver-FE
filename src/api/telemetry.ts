import { apiClient } from './client'
import { LocationPayload } from '../types'

export async function sendLocation(payload: LocationPayload): Promise<void> {
  await apiClient.post('/telemetry/locations', payload)
}
