import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'
import { AppProviders } from './providers/AppProviders'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
)
