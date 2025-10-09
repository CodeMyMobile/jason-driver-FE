import { useToast } from '../hooks/useToast.jsx'

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.variant}`}>
          <div className="toast-content">
            <strong>{toast.title}</strong>
            {toast.description ? <p>{toast.description}</p> : null}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
