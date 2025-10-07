import { useCallback, useMemo } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { useLocationStreamer } from './hooks/useLocationStreamer'
import LoginPage from './routes/login/LoginPage'
import OrdersPage from './routes/orders/OrdersPage'
import OrderDetailPage from './routes/orders/components/OrderDetailPage'
import ChatPage from './routes/chat/ChatPage'
import ProfilePage from './routes/profile/ProfilePage'

function AppShell() {
  const { driver, setStatus } = useAuth()
  const location = useLocation()

  const streamingEnabled = useMemo(
    () => driver?.status === 'ONLINE' || driver?.status === 'ON_DELIVERY',
    [driver?.status],
  )

  useLocationStreamer({ enabled: streamingEnabled })

  const handleToggleShift = useCallback(async () => {
    if (!driver) return
    const nextStatus = driver.status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE'
    await setStatus(nextStatus)
  }, [driver, setStatus])

  const showShiftHint = streamingEnabled && location.pathname.startsWith('/orders')

  return (
    <div className="app-container">
      <Header streaming={streamingEnabled} onToggleShift={handleToggleShift} />
      {showShiftHint ? (
        <div className="shift-banner" role="alert">
          Keep Jason&apos;s Driver App open during your shift to maintain live location updates.
        </div>
      ) : null}
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/chat/:threadId" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
