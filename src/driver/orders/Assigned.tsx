import { useState } from 'react'
import { AssignedOrderCard } from './AssignedOrderCard'
import { useDriverOrders } from '../hooks/useDriverOrders'

export default function AssignedOrders(): JSX.Element {
  const { assigned, isFetching, refetch, accept } = useDriverOrders()
  const [error, setError] = useState<string | undefined>(undefined)
  const [refreshing, setRefreshing] = useState(false)

  const handleAccept = async (orderId: string) => {
    setError(undefined)
    try {
      await accept(orderId)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to accept order. Please try again.')
      }
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="assigned-orders">
      <div className="assigned-header">
        <h2 className="driver-section-title">Assigned Deliveries</h2>
        <button
          type="button"
          className="assigned-refresh"
          onClick={handleRefresh}
          disabled={refreshing || isFetching}
        >
          {refreshing || isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="assigned-subhead">Accept orders that are waiting for you to begin.</p>
      {error ? <p className="assigned-error" role="alert">{error}</p> : null}
      {assigned.length === 0 ? (
        <div className="assigned-list-empty">You're all caught up! We'll notify you when the next delivery arrives.</div>
      ) : (
        <div className="assigned-cards">
          {assigned.map((order) => (
            <AssignedOrderCard key={order.id} order={order} onAccept={handleAccept} />
          ))}
        </div>
      )}
    </div>
  )
}
