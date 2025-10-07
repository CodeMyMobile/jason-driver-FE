import { apiClient, safeRequest } from './client'
import { LocationPayload } from '../types'

export async function sendLocation(payload: LocationPayload): Promise<void> {
  await safeRequest(
    async () => {
      await apiClient.post('/telemetry/locations', payload)
    },
    async () => {
      console.info('Mock telemetry send', payload)
    },
  )
}
