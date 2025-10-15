import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import OrderDetails, { STATUS_TABS } from './OrderDetails'
import previewBaseOrder from './previewOrderData'
import './Orders.css'

const STATUS_OVERRIDES = {
  assigned: {
    status: 'Assigned',
    owner: { orderCount: 1 },
  },
  accepted: {
    status: 'Accepted',
    owner: { orderCount: 2 },
  },
  progress: {
    status: 'In Progress',
    owner: { orderCount: 4 },
    cardDetails: previewBaseOrder.cardDetails,
  },
}

function normalizeStatus(rawStatus) {
  if (!rawStatus) {
    return 'assigned'
  }

  const lowered = rawStatus.toLowerCase()
  if (STATUS_OVERRIDES[lowered]) {
    return lowered
  }

  return 'assigned'
}

export default function PreviewOrderExperience() {
  const params = useParams()
  const navigate = useNavigate()

  const rawStatus = params.status
  const safeOrderId = params.orderId || previewBaseOrder._id
  const statusKey = normalizeStatus(rawStatus)

  if (!rawStatus || statusKey !== rawStatus) {
    return <Navigate to={`/preview/${statusKey}/${safeOrderId}`} replace />
  }

  const previewOrder = useMemo(() => {
    const overrides = STATUS_OVERRIDES[statusKey] ?? STATUS_OVERRIDES.assigned
    const now = Date.now()

    const baseOrder = {
      ...previewBaseOrder,
      _id: safeOrderId,
      status: overrides.status,
      createdAt: new Date(now - 8 * 60 * 1000).toISOString(),
      owner: {
        ...previewBaseOrder.owner,
        ...(overrides.owner ?? {}),
      },
      cardDetails: overrides.cardDetails ?? null,
    }

    if (statusKey === 'accepted') {
      baseOrder.acceptedAt = new Date(now - 4 * 60 * 1000).toISOString()
    }

    if (statusKey === 'progress') {
      baseOrder.acceptedAt = new Date(now - 12 * 60 * 1000).toISOString()
    }

    return baseOrder
  }, [safeOrderId, statusKey])

  const handlePreviewTabSelect = (tabKey) => {
    if (!STATUS_OVERRIDES[tabKey]) {
      return
    }

    navigate(`/preview/${tabKey}/${safeOrderId}`)
  }

  return (
    <div className="app-surface">
      <div className="app-panel">
        <div className="app-body">
          <OrderDetails
            previewOrder={previewOrder}
            previewMode
            onStatusSelect={handlePreviewTabSelect}
          />
          <p className="order-preview-note" role="status">
            This screen is interactive preview data so you can review the collapsible order
            layout without logging in.
          </p>
        </div>
      </div>
      <nav className="tab-bar" aria-label="Preview navigation">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-bar-item ${statusKey === tab.key ? 'active' : ''}`}
            onClick={() => handlePreviewTabSelect(tab.key)}
            aria-pressed={statusKey === tab.key}
          >
            <span className="tab-icon" aria-hidden="true" />
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
