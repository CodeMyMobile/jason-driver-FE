import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabPanel } from '../../components/Tabs'
import { useQueryClient, useMutation } from '../../hooks/queryClient'
import { useOrdersByStatus } from '../../hooks/useOrders'
import { OrderList } from './components/OrderList'
import { acceptOrder, fetchOrdersByStatus } from '../../api/orders'

type TabKey = 'pending' | 'active' | 'completed'

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tab = searchParams.get('tab') as TabKey
    return tab ?? 'pending'
  })
  const client = useQueryClient()

  const { data: pending, status: pendingStatus } = useOrdersByStatus('NEW')
  const assignedQuery = useOrdersByStatus('ASSIGNED')
  const inProgressQuery = useOrdersByStatus('IN_PROGRESS')
  const arrivedQuery = useOrdersByStatus('ARRIVED')
  const { data: completed, status: completedStatus } = useOrdersByStatus('COMPLETED')

  const activeOrders = useMemo(() => {
    return [
      ...(assignedQuery.data ?? []),
      ...(inProgressQuery.data ?? []),
      ...(arrivedQuery.data ?? []),
    ]
  }, [assignedQuery.data, inProgressQuery.data, arrivedQuery.data])

  const activeLoading =
    assignedQuery.status === 'loading' ||
    inProgressQuery.status === 'loading' ||
    arrivedQuery.status === 'loading'

  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const { mutateAsync: accept, error: acceptError } = useMutation({
    mutationFn: (orderId: string) => acceptOrder(orderId),
    onSuccess: () => {
      void client.fetchQuery(['orders', 'NEW'], () => fetchOrdersByStatus('NEW'))
      void client.fetchQuery(['orders', 'ASSIGNED'], () => fetchOrdersByStatus('ASSIGNED'))
      void client.fetchQuery(['orders', 'IN_PROGRESS'], () => fetchOrdersByStatus('IN_PROGRESS'))
      void client.fetchQuery(['orders', 'ARRIVED'], () => fetchOrdersByStatus('ARRIVED'))
      setAcceptingId(null)
    },
    onError: () => {
      setAcceptingId(null)
    },
  })

  const tabItems = useMemo(
    () => [
      { key: 'pending', label: 'Pending', badge: pending?.length ?? 0 },
      { key: 'active', label: 'Active', badge: activeOrders.length },
      { key: 'completed', label: 'Completed', badge: completed?.length ?? 0 },
    ],
    [pending?.length, activeOrders.length, completed?.length],
  )

  const handleTabChange = (key: string) => {
    const next = key as TabKey
    setActiveTab(next)
    setSearchParams(next === 'pending' ? {} : { tab: next })
  }

  return (
    <section id="orders" className="main-section active">
      <Tabs items={tabItems} activeKey={activeTab} onChange={handleTabChange} />
      <TabPanel active={activeTab === 'pending'}>
        <OrderList
          orders={pending}
          loading={pendingStatus === 'loading'}
          emptyLabel="No pending orders."
          onAccept={(orderId) => {
            setAcceptingId(orderId)
            void accept(orderId)
          }}
          acceptingId={acceptingId}
        />
        {acceptError ? <p className="form-error">Failed to accept order. Try again.</p> : null}
      </TabPanel>
      <TabPanel active={activeTab === 'active'}>
        <OrderList
          orders={activeOrders}
          loading={activeLoading && activeOrders.length === 0}
          emptyLabel="No active orders."
        />
      </TabPanel>
      <TabPanel active={activeTab === 'completed'}>
        <OrderList
          orders={completed}
          loading={completedStatus === 'loading'}
          emptyLabel="No completed orders yet."
        />
      </TabPanel>
    </section>
  )
}
