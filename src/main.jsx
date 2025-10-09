import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/globals.css'
import { AuthProvider } from './hooks/useAuth.jsx'
import { ToastProvider } from './hooks/useToast.jsx'
import { SocketProvider } from './hooks/useSocket.jsx'
import ToastContainer from './components/ToastContainer.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AuthProvider>
      <ToastContainer />
    </ToastProvider>
  </BrowserRouter>,
)
