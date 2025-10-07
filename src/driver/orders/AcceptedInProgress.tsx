import { useState } from 'react'
import { useDriverOrders } from '../hooks/useDriverOrders'
import { InProgressOrderCard } from './InProgressOrderCard'
import type { CompleteOrderPayload } from '../../api/orders'

export default function AcceptedInProgress(): JSX.Element {
  const { inProgress, isFetching, refetch, start, arrive, complete } = useDriverOrders()
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleStart = async (orderId: string) => {
    setError(null)
    try {
      await start(orderId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start delivery. Please try again.')
      throw err
    }
  }

  const handleArrive = async (orderId: string) => {
    setError(null)
    try {
      await arrive(orderId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log arrival. Please try again.')
      throw err
    }
  }

  const handleComplete = async (orderId: string, payload: CompleteOrderPayload) => {
    setError(null)
    try {
      await complete(orderId, payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete delivery. Please try again.')
      throw err
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
    <div className="inprogress-orders">
      <div className="assigned-header">
        <h2 className="driver-section-title">In Progress</h2>
        <button
          type="button"
          className="assigned-refresh"
          onClick={handleRefresh}
          disabled={refreshing || isFetching}
        >
          {refreshing || isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="assigned-subhead">Manage deliveries you&apos;ve accepted and are actively working.</p>
      {error ? (
        <p className="assigned-error" role="alert">
          {error}
        </p>
      ) : null}
      {inProgress.length === 0 ? (
        <div className="assigned-list-empty">No active deliveries at the moment.</div>
      ) : (
        <div className="inprogress-list">
          {inProgress.map((order) => (
            <InProgressOrderCard
              key={order.id}
              order={order}
              onStart={handleStart}
              onArrive={handleArrive}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
