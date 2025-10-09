import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getCurrentDriver, login as loginApi, updateDriverStatus } from '../api/auth.ts'
import { apiClient } from '../api/client.ts'

const AuthContext = createContext(undefined)

const TOKEN_KEY = 'jason-driver-token'
const DRIVER_KEY = 'jason-driver-profile'

export function AuthProvider({ children }) {
  const [driver, setDriver] = useState()
  const [token, setToken] = useState()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_KEY) ?? undefined
    const storedDriver = sessionStorage.getItem(DRIVER_KEY)
    setToken(storedToken)
    if (storedToken) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${storedToken}`
    }
    if (storedDriver) {
      try {
        setDriver(JSON.parse(storedDriver))
      } catch (error) {
        console.warn('Failed to parse stored driver', error)
      }
    }
    setLoading(false)
  }, [])

  const persist = useCallback((nextDriver, nextToken) => {
    setDriver(nextDriver)
    if (nextToken) {
      setToken(nextToken)
      sessionStorage.setItem(TOKEN_KEY, nextToken)
      apiClient.defaults.headers.common.Authorization = `Bearer ${nextToken}`
    }
    sessionStorage.setItem(DRIVER_KEY, JSON.stringify(nextDriver))
  }, [])

  const login = useCallback(
    async (email, password) => {
      setLoading(true)
      try {
        const response = await loginApi({ email, password })
        persist(response.driver, response.token)
      } finally {
        setLoading(false)
      }
    },
    [persist],
  )

  const logout = useCallback(() => {
    setDriver(undefined)
    setToken(undefined)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(DRIVER_KEY)
    delete apiClient.defaults.headers.common.Authorization
  }, [])

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const profile = await getCurrentDriver()
        persist(profile, token)
        apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
      } catch (error) {
        console.warn('Failed to restore session', error)
        logout()
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [logout, persist, token])

  const setStatus = useCallback(
    async (status) => {
      if (!driver) return
      const updated = await updateDriverStatus(status)
      persist(updated, token)
    },
    [driver, persist, token],
  )

  const value = useMemo(
    () => ({ driver, token, loading, login, logout, setStatus }),
    [driver, token, loading, login, logout, setStatus],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
