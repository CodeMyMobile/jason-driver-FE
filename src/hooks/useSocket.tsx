import { PropsWithChildren, createContext, useContext, useEffect, useMemo } from 'react'
import { createSocket, SocketClient, SocketHandler } from '../ws/socket'

interface SocketContextValue {
  socket: SocketClient
  subscribe: <T>(type: string, handler: SocketHandler<T>) => () => void
  emit: <T>(type: string, payload: T) => void
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined)

export function SocketProvider({ children }: PropsWithChildren): JSX.Element {
  const socket = useMemo(() => createSocket(), [])

  useEffect(() => {
    socket.connect()
    return () => socket.disconnect()
  }, [socket])

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,
      subscribe: (type, handler) => socket.on(type, handler),
      emit: (type, payload) => socket.emit(type, payload),
    }),
    [socket],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}
