import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { parse } from 'node:url'
import { createHash } from 'node:crypto'

const PORT = process.env.PORT ? Number(process.env.PORT) : 4310

const driver = {
  id: 'driver-1',
  name: 'Alex Carter',
  phone: '(555) 123-4567',
  status: 'ONLINE',
}

let token = 'mock-token'

const orders = [
  {
    id: 'JL-2847',
    total: 127.5,
    status: 'NEW',
    customer: {
      name: 'Michael Rodriguez',
      phone: '555-123-4567',
      address: '500 Market Street, San Francisco, CA',
    },
    requiresIdCheck: true,
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 'JL-2846',
    total: 156,
    status: 'ARRIVED',
    customer: {
      name: 'John Doe',
      phone: '555-246-8135',
      address: '123 Market Street, San Francisco, CA 94103',
    },
    requiresIdCheck: true,
    assignedDriverId: driver.id,
    createdAt: new Date(Date.now() - 28 * 60000).toISOString(),
  },
  {
    id: 'JL-2845',
    total: 98.25,
    status: 'COMPLETED',
    customer: {
      name: 'Alice Lee',
      phone: '555-432-1000',
      address: '700 Mission Street, San Francisco, CA',
    },
    requiresIdCheck: true,
    assignedDriverId: driver.id,
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
]

const threads = [
  {
    id: 'thread-1',
    participants: ['CUSTOMER', 'DRIVER'],
    lastMessageAt: new Date().toISOString(),
    orderId: 'JL-2846',
  },
]

const messages = [
  {
    id: randomUUID(),
    sender: 'CUSTOMER',
    text: 'Hi! Please call when you arrive.',
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    threadId: 'thread-1',
  },
]

const locationBuffer = []

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(body))
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
  })
}

function authenticate(req, res) {
  const auth = req.headers['authorization']
  if (!auth || auth !== `Bearer ${token}`) {
    json(res, 401, { error: 'Unauthorized' })
    return false
  }
  return true
}

const server = http.createServer(async (req, res) => {
  const { pathname, query } = parse(req.url || '', true)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    })
    res.end()
    return
  }

  if (pathname === '/auth/login' && req.method === 'POST') {
    const body = await parseBody(req)
    if (!body.email || !body.password || body.password.length < 6) {
      json(res, 400, { error: 'Invalid credentials' })
      return
    }
    token = `mock-${randomUUID()}`
    json(res, 200, { token, driver })
    return
  }

  if (pathname === '/driver/me' && req.method === 'GET') {
    if (!authenticate(req, res)) return
    json(res, 200, driver)
    return
  }

  if (pathname === '/driver/status' && req.method === 'PATCH') {
    if (!authenticate(req, res)) return
    const body = await parseBody(req)
    if (!body.status) {
      json(res, 400, { error: 'Missing status' })
      return
    }
    driver.status = body.status
    broadcast({ type: 'DRIVER_BROADCAST', payload: { driver } })
    json(res, 200, driver)
    return
  }

  if (pathname === '/orders' && req.method === 'GET') {
    if (!authenticate(req, res)) return
    const statusFilter = query.status
    const result = statusFilter
      ? orders.filter((order) => order.status === statusFilter)
      : orders
    json(res, 200, result)
    return
  }

  if (pathname?.startsWith('/orders/') && req.method === 'GET') {
    if (!authenticate(req, res)) return
    const id = pathname.split('/')[2]
    const order = orders.find((item) => item.id === id)
    if (!order) {
      json(res, 404, { error: 'Not found' })
      return
    }
    json(res, 200, order)
    return
  }

  if (pathname?.match(/^\/orders\/.+\/(accept|start|arrive|complete)$/) && req.method === 'POST') {
    if (!authenticate(req, res)) return
    const [, , orderId, action] = pathname.split('/')
    const order = orders.find((item) => item.id === orderId)
    if (!order) {
      json(res, 404, { error: 'Order not found' })
      return
    }
    if (action === 'accept') {
      order.status = 'ASSIGNED'
      order.assignedDriverId = driver.id
    }
    if (action === 'start') {
      order.status = 'IN_PROGRESS'
      order.startedAt = new Date().toISOString()
    }
    if (action === 'arrive') {
      order.status = 'ARRIVED'
      order.arrivedAt = new Date().toISOString()
    }
    if (action === 'complete') {
      const body = await parseBody(req)
      order.status = 'COMPLETED'
      order.completedAt = new Date().toISOString()
      order.proof = body?.proof
    }
    broadcast({ type: 'ORDER_UPDATED', payload: order })
    json(res, 200, { ok: true })
    return
  }

  if (pathname === '/telemetry/locations' && req.method === 'POST') {
    if (!authenticate(req, res)) return
    const body = await parseBody(req)
    locationBuffer.push(body)
    if (locationBuffer.length > 50) {
      locationBuffer.shift()
    }
    json(res, 200, { ok: true })
    return
  }

  if (pathname === '/chat/threads' && req.method === 'GET') {
    if (!authenticate(req, res)) return
    const { orderId } = query
    const filtered = orderId
      ? threads.filter((thread) => thread.orderId === orderId)
      : threads
    json(res, 200, filtered)
    return
  }

  if (pathname?.startsWith('/chat/threads/') && req.method === 'GET') {
    if (!authenticate(req, res)) return
    const [, , threadId] = pathname.split('/')
    const threadMessages = messages.filter((msg) => msg.threadId === threadId)
    json(res, 200, threadMessages)
    return
  }

  if (pathname?.endsWith('/messages') && req.method === 'POST') {
    if (!authenticate(req, res)) return
    const [, , threadId] = pathname.split('/')
    const body = await parseBody(req)
    const message = {
      id: randomUUID(),
      sender: 'DRIVER',
      text: body.text,
      createdAt: new Date().toISOString(),
      threadId,
    }
    messages.push(message)
    broadcast({ type: 'CHAT_MESSAGE', payload: message })
    json(res, 200, message)
    return
  }

  json(res, 404, { error: 'Not found' })
})

const sockets = new Set()

function broadcast(message) {
  const frame = createFrame(JSON.stringify(message))
  for (const socket of sockets) {
    socket.write(frame)
  }
}

function createFrame(data) {
  const json = Buffer.from(data)
  const length = json.length
  let header
  if (length < 126) {
    header = Buffer.alloc(2)
    header[0] = 0x81
    header[1] = length
  } else if (length < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(length, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x81
    header[1] = 127
    header.writeBigUInt64BE(BigInt(length), 2)
  }
  return Buffer.concat([header, json])
}

function handleData(socket, buffer) {
  const firstByte = buffer[0]
  const opCode = firstByte & 0x0f
  if (opCode === 0x8) {
    sockets.delete(socket)
    socket.end()
    return
  }
  const secondByte = buffer[1]
  const isMasked = Boolean(secondByte & 0x80)
  let payloadLength = secondByte & 0x7f
  let offset = 2
  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(offset)
    offset += 2
  } else if (payloadLength === 127) {
    payloadLength = Number(buffer.readBigUInt64BE(offset))
    offset += 8
  }
  let mask
  if (isMasked) {
    mask = buffer.slice(offset, offset + 4)
    offset += 4
  }
  const payload = buffer.slice(offset, offset + payloadLength)
  if (isMasked && mask) {
    for (let i = 0; i < payload.length; i += 1) {
      payload[i] ^= mask[i % 4]
    }
  }
  const message = payload.toString('utf8')
  try {
    const parsed = JSON.parse(message)
    if (parsed.type === 'CHAT_MESSAGE') {
      const chatMessage = {
        id: randomUUID(),
        sender: 'DRIVER',
        text: parsed.payload?.text ?? '',
        createdAt: new Date().toISOString(),
        threadId: parsed.payload?.threadId ?? 'thread-1',
      }
      messages.push(chatMessage)
      broadcast({ type: 'CHAT_MESSAGE', payload: chatMessage })
    }
  } catch (error) {
    console.error('Failed to parse ws message', error)
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key']
  if (!key) {
    socket.destroy()
    return
  }
  const acceptKey = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64')
  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n',
    ].join('\r\n'),
  )
  sockets.add(socket)
  socket.on('data', (buffer) => handleData(socket, buffer))
  socket.on('close', () => sockets.delete(socket))
})

server.listen(PORT, () => {
  console.log(`Mock CMS listening on http://localhost:${PORT}`)
})

server.on('listening', () => {
  console.log(`WebSocket endpoint ready at ws://localhost:${PORT}`)
})
