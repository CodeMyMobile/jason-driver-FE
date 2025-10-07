const rawBase = import.meta.env.VITE_API_BASE_URL
const fallbackBase = 'https://api.jasonsliquor.com'

const sanitizedBase = (rawBase && rawBase.trim().replace(/\/+$/, '')) || fallbackBase

const service = {
  base: sanitizedBase,
  api: `${sanitizedBase}/api`,
}

export default service
