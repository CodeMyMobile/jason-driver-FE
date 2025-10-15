import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const redirectStorageKey = 'jdl:redirect'

if (typeof window !== 'undefined') {
  const storedRedirect = window.sessionStorage.getItem(redirectStorageKey)

  if (storedRedirect) {
    window.sessionStorage.removeItem(redirectStorageKey)

    const basePath = import.meta.env.BASE_URL || '/'
    const normalisedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
    const redirectPath = storedRedirect.startsWith('/') ? storedRedirect : `/${storedRedirect}`

    const newUrl = `${normalisedBase}${redirectPath}`
    window.history.replaceState(null, '', newUrl)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
