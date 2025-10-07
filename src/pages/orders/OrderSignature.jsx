import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchOrderById } from '../../services/orderService'
import './Orders.css'

function formatName(owner) {
  if (!owner) {
    return 'Customer'
  }

  return [owner?.name?.first, owner?.name?.last].filter(Boolean).join(' ') || 'Customer'
}

export default function OrderSignature() {
  const { status = 'progress', orderId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const canvasRef = useRef(null)
  const { token } = useAuth()

  const locationState = useMemo(() => location.state ?? {}, [location.state])
  const initialOrder = locationState.order ?? null

  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(!initialOrder)
  const [error, setError] = useState(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [infoMessage, setInfoMessage] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadOrder() {
      if (!token || !orderId || initialOrder) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await fetchOrderById(orderId, token)
        if (!ignore) {
          setOrder(data)
        }
      } catch (err) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : 'Unable to load order.'
          setError(message)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadOrder()

    return () => {
      ignore = true
    }
  }, [initialOrder, orderId, token])

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const parent = canvas.parentElement
    const width = parent ? parent.clientWidth : 600
    const height = 280

    canvas.width = width
    canvas.height = height
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111827'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }, [])

  useEffect(() => {
    prepareCanvas()
    window.addEventListener('resize', prepareCanvas)

    return () => {
      window.removeEventListener('resize', prepareCanvas)
    }
  }, [prepareCanvas])

  const getCoordinates = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return { x: 0, y: 0 }
    }

    const rect = canvas.getBoundingClientRect()
    const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0
    const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? 0

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const handlePointerDown = useCallback(
    (event) => {
      event.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      const ctx = canvas.getContext('2d')
      const { x, y } = getCoordinates(event)
      ctx.beginPath()
      ctx.moveTo(x, y)
      setIsDrawing(true)
    },
    [getCoordinates],
  )

  const handlePointerMove = useCallback(
    (event) => {
      if (!isDrawing) {
        return
      }

      event.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      const ctx = canvas.getContext('2d')
      const { x, y } = getCoordinates(event)
      ctx.lineTo(x, y)
      ctx.stroke()
      setHasSignature(true)
    },
    [getCoordinates, isDrawing],
  )

  const handlePointerUp = useCallback(
    (event) => {
      if (!isDrawing) {
        return
      }

      event.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      const ctx = canvas.getContext('2d')
      ctx.closePath()
      setIsDrawing(false)
    },
    [isDrawing],
  )

  const handleClear = useCallback(() => {
    prepareCanvas()
    setHasSignature(false)
    setInfoMessage(null)
  }, [prepareCanvas])

  const handleCancel = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !order) {
      return
    }

    if (!hasSignature) {
      setInfoMessage({ type: 'error', text: 'Please provide a signature before saving.' })
      return
    }

    const dataUrl = canvas.toDataURL('image/png')

    navigate(`/orders/${status}/${orderId}/bypass`, {
      replace: true,
      state: {
        order,
        signatureData: dataUrl,
        idPicture: locationState.idPicture ?? null,
        from: 'signature',
      },
    })
  }, [hasSignature, navigate, order, orderId, status, locationState.idPicture])

  if (loading && !order) {
    return (
      <div className="screen">
        <div className="spinner" aria-label="Loading order" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="screen">
        <div className="form-error" role="alert">
          {error || 'Order not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="finalize-screen">
      <header className="finalize-header">
        <div>
          <button type="button" className="link-button" onClick={handleCancel}>
            Back
          </button>
        </div>
        <h1>Capture Signature</h1>
        <p className="order-card-meta">Ask {formatName(order.owner)} to sign below.</p>
      </header>

      {infoMessage ? (
        <p className={`notice ${infoMessage.type}`} role="status">
          {infoMessage.text}
        </p>
      ) : null}

      <section className="finalize-card">
        <div className="signature-wrapper">
          <canvas
            ref={canvasRef}
            className="signature-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
        <div className="finalize-actions">
          <button type="button" className="action-button" onClick={handleClear}>
            Clear
          </button>
          <button type="button" className="action-button" onClick={handleSave}>
            Save Signature
          </button>
          <button type="button" className="action-button" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  )
}
