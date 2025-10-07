import { useState } from 'react'
import { useDriverOrders } from '../hooks/useDriverOrders'
import { CompletedOrderCard } from './CompletedOrderCard'

export default function CompletedOrders(): JSX.Element {
  const { completed, isFetching, refetch } = useDriverOrders()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="completed-orders">
      <div className="assigned-header">
        <h2 className="driver-section-title">Completed</h2>
        <button
          type="button"
          className="assigned-refresh"
          onClick={handleRefresh}
          disabled={refreshing || isFetching}
        >
          {refreshing || isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="assigned-subhead">Review your recent deliveries and proof of completion.</p>
      {completed.length === 0 ? (
        <div className="assigned-list-empty">No completed deliveries yet today.</div>
      ) : (
        <div className="completed-list">
          {completed.map((order) => (
            <CompletedOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
