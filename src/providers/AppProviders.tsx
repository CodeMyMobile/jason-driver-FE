import type { ReactNode } from 'react'
import { AuthProvider } from '../context/AuthContext'
import { QueryClientProvider } from '../hooks/queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
