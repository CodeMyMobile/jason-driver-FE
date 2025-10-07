interface TrackingIndicatorProps {
  active: boolean
}

export function TrackingIndicator({ active }: TrackingIndicatorProps): JSX.Element {
  return (
    <div className={`tracking-indicator ${active ? 'active' : ''}`.trim()}>
      <span className="tracking-dot" aria-hidden="true" />
      <span>{active ? 'Tracking Active' : 'Tracking Paused'}</span>
    </div>
  )
}
