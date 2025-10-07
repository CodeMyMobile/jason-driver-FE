import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchMessages, postMessage } from '../../api/chat'
import type { Message } from '../../types'
import { useQuery, useQueryClient, useMutation } from '../../hooks/queryClient'
import { useSocket } from '../../ws/socket'

export default function ChatPage() {
  const { threadId = '' } = useParams()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const client = useQueryClient()

  const {
    data: messages,
    status,
    refetch,
  } = useQuery(['chat', threadId], () => fetchMessages(threadId), { enabled: Boolean(threadId), staleTime: 10000 })

  useEffect(() => {
    void refetch()
  }, [refetch])

  const { mutateAsync: send } = useMutation({
    mutationFn: () => postMessage(threadId, { text }),
    onSuccess: (message) => {
      const cache = client.getEntry<Message[]>(['chat', threadId]).data ?? []
      client.setQueryData(['chat', threadId], [...cache, message])
      setText('')
    },
  })

  useSocket('CHAT_MESSAGE', (payload) => {
    const message = payload as Message
    if (message && message.id && message.createdAt) {
      const cache = client.getEntry<Message[]>(['chat', threadId]).data ?? []
      if (cache.some((item) => item.id === message.id)) return
      client.setQueryData(['chat', threadId], [...cache, message])
    }
  })

  if (!threadId) {
    return (
      <div className="list-placeholder">
        No chat selected.
        <button type="button" className="secondary-link" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    await send()
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <button type="button" className="secondary-link" onClick={() => navigate(-1)}>
          ← Orders
        </button>
        <h1>Chat</h1>
      </header>
      <div className="chat-messages" role="log" aria-live="polite">
        {status === 'loading' ? <p>Loading messages…</p> : null}
        {messages?.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.sender === 'DRIVER' ? 'outbound' : 'inbound'}`}>
            <p>{message.text}</p>
            <span className="chat-meta">{new Date(message.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Message customer or staff…"
          rows={2}
          required
        />
        <button type="submit" className="action-btn" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
