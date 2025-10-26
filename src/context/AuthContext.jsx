import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchOverallRating, logIn, updateDriverProfile } from '../services/authService'

const AuthContext = createContext(null)

const USER_STORAGE_KEY = 'jdl:user'
const TOKEN_STORAGE_KEY = 'jdl:token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [initialising, setInitialising] = useState(true)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState(null)
  const clearAuthError = useCallback(() => setError(null), [])

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY)
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)

    if (storedUser && storedToken) {
      if (storedUser === 'undefined' || storedUser === 'null') {
        localStorage.removeItem(USER_STORAGE_KEY)
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      } else {
        try {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
          setToken(storedToken)
        } catch (err) {
          console.error('Failed to parse stored user', err)
          localStorage.removeItem(USER_STORAGE_KEY)
          localStorage.removeItem(TOKEN_STORAGE_KEY)
        }
      }
    } else if (!storedUser && storedToken) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }

    setInitialising(false)
  }, [])

  const handleLogin = useCallback(async (email, password) => {
    setAuthenticating(true)
    setError(null)

    try {
      const data = await logIn(email, password)
      const authenticatedUser = data?.user ?? data?.driver

      if (!authenticatedUser || !data?.token) {
        throw new Error('Invalid login response from server.')
      }

      setUser(authenticatedUser)
      setToken(data.token)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authenticatedUser))
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token)

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to login.'
      setError(message)
      throw err
    } finally {
      setAuthenticating(false)
    }
  }, [])

  const handleLogout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }, [])

  const handleProfileUpdate = useCallback(
    async (driverId, payload) => {
      if (!token) {
        throw new Error('You must be logged in to update profile information.')
      }

      const updatedUser = await updateDriverProfile(driverId, payload, token)
      setUser(updatedUser)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
      return updatedUser
    },
    [token],
  )

  const handleFetchRating = useCallback(
    async (driverId) => {
      if (!token) {
        throw new Error('You must be logged in to view rating information.')
      }

      const rating = await fetchOverallRating(driverId, token)
      return rating
    },
    [token],
  )

  const value = useMemo(
    () => ({
      user,
      token,
      initialising,
      authenticating,
      error,
      login: handleLogin,
      logout: handleLogout,
      updateProfile: handleProfileUpdate,
      loadOverallRating: handleFetchRating,
      clearError: clearAuthError,
    }),
    [
      user,
      token,
      initialising,
      authenticating,
      error,
      handleLogin,
      handleLogout,
      handleProfileUpdate,
      handleFetchRating,
      clearAuthError,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
