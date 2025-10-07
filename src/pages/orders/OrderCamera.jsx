import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LoaderOverlay from '../../components/LoaderOverlay'
import { useAuth } from '../../context/AuthContext'
import { fetchOrderById, uploadImage } from '../../services/orderService'
import './Orders.css'

function formatName(owner) {
  if (!owner) {
    return 'Customer'
  }

  return [owner?.name?.first, owner?.name?.last].filter(Boolean).join(' ') || 'Customer'
}

export default function OrderCamera() {
  const { status = 'progress', orderId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const { token } = useAuth()

  const locationState = useMemo(() => location.state ?? {}, [location.state])
  const initialOrder = locationState.order ?? null

  const [order, setOrder] = useState(initialOrder)
  const [loading, setLoading] = useState(!initialOrder)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
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
        const result = await fetchOrderById(orderId, token)
        if (!ignore) {
          setOrder(result)
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

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0]

    if (!file) {
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    setInfoMessage(null)
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleRetake = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setInfoMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!order || !orderId) {
      return
    }

    if (!selectedFile && !previewUrl) {
      setInfoMessage({ type: 'error', text: 'Please select an image before uploading.' })
      return
    }

    setActionLoading(true)
    setInfoMessage(null)

    try {
      const imageSource = selectedFile ?? previewUrl
      const uploadedUrl = await uploadImage(imageSource)

      navigate(`/orders/${status}/${orderId}/bypass`, {
        replace: true,
        state: {
          order,
          idPicture: uploadedUrl,
          signatureData: locationState.signatureData ?? null,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to upload image.'
      setInfoMessage({ type: 'error', text: message })
    } finally {
      setActionLoading(false)
    }
  }, [navigate, order, orderId, previewUrl, selectedFile, status, locationState.signatureData])

  const handleCancel = useCallback(() => {
    if (locationState.from === 'bypass' && order) {
      navigate(`/orders/${status}/${orderId}/bypass`, {
        replace: true,
        state: {
          order,
          signatureData: locationState.signatureData ?? null,
          idPicture: locationState.idPicture ?? null,
        },
      })
      return
    }

    navigate(-1)
  }, [locationState.from, locationState.idPicture, locationState.signatureData, navigate, order, orderId, status])

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
      <LoaderOverlay show={actionLoading} label="Uploading image…" />
      <header className="finalize-header">
        <div>
          <button type="button" className="link-button" onClick={handleCancel}>
            Back
          </button>
        </div>
        <h1>Verify Info</h1>
        <p className="order-card-meta">Upload a photo ID for {formatName(order.owner)}.</p>
      </header>

      {infoMessage ? (
        <p className={`notice ${infoMessage.type}`} role="status">
          {infoMessage.text}
        </p>
      ) : null}

      <section className="finalize-card">
        <div className="image-preview" aria-live="polite">
          {previewUrl ? (
            <img src={previewUrl} alt="Selected identification" />
          ) : (
            <div className="image-preview-placeholder">No image selected</div>
          )}
        </div>

        <div className="finalize-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="visually-hidden"
            id="order-verify-file"
          />
          <label className="action-button" htmlFor="order-verify-file">
            {previewUrl ? 'Choose Different Photo' : 'Choose Photo'}
          </label>

          {previewUrl ? (
            <button type="button" className="action-button" onClick={handleRetake}>
              Remove Photo
            </button>
          ) : null}

          <button type="button" className="action-button" onClick={handleUpload}>
            {previewUrl ? 'Upload to Cloud' : 'Upload Image'}
          </button>

          <button type="button" className="action-button" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  )
}
