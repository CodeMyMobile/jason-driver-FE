import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchCurrentDriver, login as apiLogin, updateDriverStatus } from '../api/auth'
import { setAuthToken } from '../api/client'
import type { Driver, DriverStatus } from '../types'

const DRIVER_STORAGE_KEY = 'jdl:driver'
const TOKEN_STORAGE_KEY = 'jdl:token'

interface AuthContextValue {
  driver: Driver | null
  token: string | null
  loading: boolean
  loggingIn: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  setStatus: (status: DriverStatus) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface Props {
  children: ReactNode
}

export function AuthProvider({ children }: Props) {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY)
    const storedDriver = sessionStorage.getItem(DRIVER_STORAGE_KEY)
    if (storedToken) {
      setToken(storedToken)
      setAuthToken(storedToken)
    }
    if (storedDriver) {
      try {
        setDriver(JSON.parse(storedDriver))
      } catch (err) {
        console.error('Failed to parse stored driver', err)
        sessionStorage.removeItem(DRIVER_STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  const persist = useCallback((nextDriver: Driver | null, nextToken: string | null) => {
    setDriver(nextDriver)
    setToken(nextToken)
    if (nextDriver) {
      sessionStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(nextDriver))
    } else {
      sessionStorage.removeItem(DRIVER_STORAGE_KEY)
    }
    setAuthToken(nextToken)
    if (nextToken) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      setLoggingIn(true)
      setError(null)
      try {
        const { driver: driverProfile, token: authToken } = await apiLogin(email, password)
        persist(driverProfile, authToken)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to sign in.'
        setError(message)
        throw err
      } finally {
        setLoggingIn(false)
      }
    },
    [persist],
  )

  const logout = useCallback(() => {
    persist(null, null)
  }, [persist])

  const refreshProfile = useCallback(async () => {
    if (!token) return
    const latest = await fetchCurrentDriver()
    persist(latest, token)
  }, [persist, token])

  const setStatus = useCallback(
    async (status: DriverStatus) => {
      const next = await updateDriverStatus(status)
      persist(next, token)
    },
    [persist, token],
  )

  const value = useMemo(
    () => ({
      driver,
      token,
      loading,
      loggingIn,
      error,
      login,
      logout,
      refreshProfile,
      setStatus,
    }),
    [driver, token, loading, loggingIn, error, login, logout, refreshProfile, setStatus],
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
