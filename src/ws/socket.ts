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
    if (this.socket) {
      return
    }

    if (!this.url) {
      console.warn('WebSocket URL is not configured; skipping socket connection.')
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
      console.error('WebSocket connection failed', error)
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

export function createSocket(): SocketClient {
  const wsUrl = import.meta.env.VITE_WS_URL
  return new SocketClient(wsUrl)
}
