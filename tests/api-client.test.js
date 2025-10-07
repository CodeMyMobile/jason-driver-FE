import { strict as assert } from 'node:assert'
import test from 'node:test'

const storage = new Map()

globalThis.sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}

test('api client attaches auth header and base URL', async () => {
  process.env.VITE_CMS_BASE_URL = 'http://example.test'
  const { apiClient, setAuthToken, getBaseUrl } = await import('./dist/api/client.js')

  setAuthToken('abc123')

  apiClient.defaults.adapter = async (config) => ({
    data: config.headers?.Authorization ?? null,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })

  const response = await apiClient.get('/ping')
  assert.equal(response.data, 'Bearer abc123')
  assert.equal(getBaseUrl(), 'http://example.test')
})
