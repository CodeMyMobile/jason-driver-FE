import { apiClient } from './client'
import type { LocationPayload } from '../types'

export async function postLocation(payload: LocationPayload) {
  await apiClient.post('/telemetry/locations', payload)
}
