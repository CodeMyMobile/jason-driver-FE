import { mockMessages } from '../api/mockData'
import { SocketEvent } from '../types'

export type SocketHandler<T = unknown> = (payload: T) => void

interface ListenerRecord {
  type: string
  handler: SocketHandler
}

export class SocketClient {
  private socket?: WebSocket

  protected listeners: ListenerRecord[] = []

  private heartbeat?: number

  constructor(private readonly url?: string) {}

  connect(): void {
    if (this.socket || !this.url) {
      return
    }

    try {
      this.socket = new WebSocket(this.url)
      this.socket.addEventListener('message', (event) => {
        const data: SocketEvent = JSON.parse(event.data)
        this.listeners
          .filter((listener) => listener.type === data.type)
          .forEach((listener) => listener.handler(data.payload))
      })
      this.socket.addEventListener('open', () => {
        this.startHeartbeat()
      })
      this.socket.addEventListener('close', () => {
        this.stopHeartbeat()
        this.socket = undefined
      })
    } catch (error) {
      console.warn('Falling back to mock socket', error)
    }
  }

  disconnect(): void {
    this.socket?.close()
    this.stopHeartbeat()
    this.socket = undefined
  }

  emit<T>(type: string, payload: T): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }))
    }
  }

  on<T>(type: string, handler: SocketHandler<T>): () => void {
    const listener: ListenerRecord = { type, handler }
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener)
    }
  }

  private startHeartbeat(): void {
    this.heartbeat = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'PING', payload: Date.now() }))
      }
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      window.clearInterval(this.heartbeat)
    }
  }
}

export class MockSocket extends SocketClient {
  private timer?: number

  connect(): void {
    this.timer = window.setInterval(() => {
      const lastMessage = mockMessages[mockMessages.length - 1]
      if (lastMessage) {
        this.dispatch('CHAT_MESSAGE', lastMessage)
      }
    }, 15000)
  }

  disconnect(): void {
    if (this.timer) {
      window.clearInterval(this.timer)
    }
    super.disconnect()
  }

  emit<T>(type: string, payload: T): void {
    if (type === 'CHAT_MESSAGE') {
      this.dispatch(type, payload)
    }
  }

  private dispatch<T>(type: string, payload: T): void {
    this.listeners
      .filter((listener) => listener.type === type)
      .forEach((listener) => listener.handler(payload))
  }
}

export function createSocket(): SocketClient {
  const wsUrl = import.meta.env.VITE_WS_URL
  if (wsUrl) {
    return new SocketClient(wsUrl)
  }
  return new MockSocket()
}
