import io from 'socket.io-client'

import urls from '../services/urlServices'

export type SocketHandler<T = unknown> = (payload: T) => void

interface ListenerRecord {
  type: string
  handler: SocketHandler
}

const DEFAULT_SOCKET_PATH = '/drivers/orders'

const defaultOptions = {
  transports: ['websocket'],
  query: 'b64=1',
}

type SocketInstance = ReturnType<typeof io>

export class SocketClient {
  private socket?: SocketInstance

  protected listeners: ListenerRecord[] = []

  constructor(private readonly url?: string) {}

  connect(): void {
    if (this.socket || !this.url) {
      return
    }

    this.socket = io(this.url, {
      ...defaultOptions,
      autoConnect: true,
      forceNew: true,
      path: '/socket.io',
    })

    this.listeners.forEach(({ type, handler }) => {
      this.socket?.on(type, handler)
    })

    this.socket.on('disconnect', () => {
      this.socket?.removeAllListeners()
      this.socket = undefined
    })

    this.socket.on('connect_error', (error: Error) => {
      console.warn('Socket connection error', error)
    })
  }

  disconnect(): void {
    this.socket?.removeAllListeners()
    this.socket?.disconnect()
    this.socket = undefined
  }

  emit<T>(type: string, payload: T): void {
    this.socket?.emit(type, payload)
  }

  on<T>(type: string, handler: SocketHandler<T>): () => void {
    const listener: ListenerRecord = { type, handler }
    this.listeners.push(listener)

    if (this.socket) {
      this.socket.on(type, handler as SocketHandler)
    }

    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener)
      const activeSocket = this.socket as SocketInstance | undefined
      if (activeSocket?.off) {
        activeSocket.off(type, handler as SocketHandler)
      } else if (activeSocket?.removeListener) {
        activeSocket.removeListener(type, handler as SocketHandler)
      }
    }
  }
}

export function createSocket(): SocketClient {
  const baseUrl = import.meta.env.VITE_SOCKET_URL || `${urls.api}${DEFAULT_SOCKET_PATH}`
  return new SocketClient(baseUrl)
}
