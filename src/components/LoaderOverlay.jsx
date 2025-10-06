export default function LoaderOverlay({ show, label = 'Loading' }) {
  if (!show) {
    return null
  }

  return (
    <div className="loader-overlay" role="status" aria-live="assertive">
      <div className="loader-overlay-card">
        <div className="spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  )
}
