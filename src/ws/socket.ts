import { useEffect, useRef } from 'react'

type Listener = (payload: any) => void

interface SocketMessage {
  type: string
  payload?: unknown
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4311'

class SocketClient {
  private socket: WebSocket | null = null
  private listeners = new Map<string, Set<Listener>>()

  constructor(private url: string) {}

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return
    }
    this.socket = new WebSocket(this.url)
    this.socket.addEventListener('message', (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data)
        if (message?.type) {
          this.listeners.get(message.type)?.forEach((listener) => listener(message.payload))
        }
      } catch (err) {
        console.error('Failed to parse socket message', err)
      }
    })
    this.socket.addEventListener('close', () => {
      setTimeout(() => this.connect(), 2000)
    })
  }

  subscribe(event: string, listener: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return () => {
      this.listeners.get(event)?.delete(listener)
    }
  }

  send(message: SocketMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    }
  }
}

const singleton = new SocketClient(WS_URL)

export function useSocket(event: string, handler: Listener | null) {
  const savedHandler = useRef<Listener | null>(handler)

  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    singleton.connect()
    if (!handler) return
    const unsubscribe = singleton.subscribe(event, (payload) => savedHandler.current?.(payload))
    return unsubscribe
  }, [event, handler])
}

export function useSocketClient() {
  useEffect(() => {
    singleton.connect()
  }, [])
  return singleton
}
