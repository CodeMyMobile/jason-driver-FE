import { createContext, useContext, useEffect, useMemo } from 'react'
import { createSocket } from '../ws/socket.ts'

const SocketContext = createContext(undefined)

export function SocketProvider({ children }) {
  const socket = useMemo(() => createSocket(), [])

  useEffect(() => {
    socket.connect()
    return () => socket.disconnect()
  }, [socket])

  const value = useMemo(
    () => ({
      socket,
      subscribe: (type, handler) => socket.on(type, handler),
      emit: (type, payload) => socket.emit(type, payload),
    }),
    [socket],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}
