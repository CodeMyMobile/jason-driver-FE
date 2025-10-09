import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AxiosError } from 'axios'
import { getCurrentDriver, login as loginApi, updateDriverStatus } from '../api/auth'
import { apiClient } from '../api/client'
import { Driver, DriverStatus } from '../types'

interface AuthContextValue {
  driver?: Driver
  token?: string
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setStatus: (status: DriverStatus) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'jason-driver-token'
const DRIVER_KEY = 'jason-driver-profile'

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [driver, setDriver] = useState<Driver | undefined>(undefined)
  const [token, setToken] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const lastBootstrappedTokenRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_KEY) ?? undefined
    const storedDriver = sessionStorage.getItem(DRIVER_KEY)
    setToken(storedToken)
    if (storedToken) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${storedToken}`
    }
    if (storedDriver) {
      try {
        setDriver(JSON.parse(storedDriver) as Driver)
      } catch (error) {
        console.warn('Failed to parse stored driver', error)
      }
    }
    setLoading(false)
  }, [])

  const persist = useCallback((nextDriver: Driver, nextToken?: string) => {
    setDriver(nextDriver)
    if (nextToken) {
      setToken(nextToken)
      sessionStorage.setItem(TOKEN_KEY, nextToken)
      apiClient.defaults.headers.common.Authorization = `Bearer ${nextToken}`
    }
    sessionStorage.setItem(DRIVER_KEY, JSON.stringify(nextDriver))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await loginApi({ email, password })
      persist(response.driver, response.token)
    } finally {
      setLoading(false)
    }
  }, [persist])

  const logout = useCallback(() => {
    setDriver(undefined)
    setToken(undefined)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(DRIVER_KEY)
    delete apiClient.defaults.headers.common.Authorization
    lastBootstrappedTokenRef.current = undefined
  }, [])

  const isUnauthorizedError = useCallback((error: unknown) => {
    const status = (error as AxiosError | undefined)?.response?.status
    return status === 401 || status === 403
  }, [])

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setLoading(false)
        return
      }
      if (lastBootstrappedTokenRef.current === token) {
        return
      }
      lastBootstrappedTokenRef.current = token
      try {
        const profile = await getCurrentDriver()
        persist(profile, token)
        apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
      } catch (error) {
        console.warn('Failed to restore session', error)
        if (isUnauthorizedError(error)) {
          logout()
        }
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [isUnauthorizedError, logout, persist, token])

  const setStatus = useCallback(async (status: DriverStatus) => {
    if (!driver) return
    const updated = await updateDriverStatus(status)
    persist(updated, token)
  }, [driver, persist, token])

  const value = useMemo<AuthContextValue>(
    () => ({ driver, token, loading, login, logout, setStatus }),
    [driver, token, loading, login, logout, setStatus],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
