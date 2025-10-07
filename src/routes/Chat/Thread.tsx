import { FormEvent, useEffect, useRef, useState } from 'react'
import { getMessages, sendMessage } from '../../api/chat'
import { Message } from '../../types'
import { useSocket } from '../../hooks/useSocket'
import { useToast } from '../../hooks/useToast'

export default function ChatThread(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const { subscribe, emit } = useSocket()
  const { push } = useToast()

  useEffect(() => {
    async function load() {
      const data = await getMessages()
      setMessages(data)
      scrollToBottom()
    }
    load()
  }, [])

  useEffect(() => {
    const unsubscribe = subscribe<Message>('CHAT_MESSAGE', (payload) => {
      setMessages((current) => {
        if (current.some((message) => message.id === payload.id)) {
          return current
        }
        return [...current, payload]
      })
      scrollToBottom()
    })
    return unsubscribe
  }, [subscribe])

  function scrollToBottom() {
    const container = listRef.current
    if (!container) return
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!input.trim()) return
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      sender: 'DRIVER',
      text: input,
      createdAt: new Date().toISOString(),
    }
    setMessages((current) => [...current, optimistic])
    setInput('')
    scrollToBottom()
    try {
      const response = await sendMessage(optimistic.text)
      setMessages((current) => current.map((message) => (message.id === optimistic.id ? response : message)))
      emit('CHAT_MESSAGE', response)
    } catch (error) {
      push({ title: 'Message failed to send', description: 'Please try again.', variant: 'error' })
    }
  }

  return (
    <div className="chat-thread">
      <div className="chat-messages" ref={listRef}>
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.sender.toLowerCase()}`}>
            <span>{message.text}</span>
            <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Message staff or customer..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
