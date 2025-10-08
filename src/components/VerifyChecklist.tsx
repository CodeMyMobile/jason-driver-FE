interface VerifyChecklistProps {
  idChecked: boolean
  paymentChecked: boolean
  requiresIdCheck?: boolean
  requiresPaymentCheck?: boolean
  onChange: (next: { idChecked: boolean; paymentChecked: boolean }) => void
}

export function VerifyChecklist({
  idChecked,
  paymentChecked,
  requiresIdCheck = true,
  requiresPaymentCheck = true,
  onChange,
}: VerifyChecklistProps): JSX.Element {
  const showIdCheck = requiresIdCheck
  const showPaymentCheck = requiresPaymentCheck

  return (
    <div className="verify-section">
      <div className="verify-header">
        <h3>Required Verifications</h3>
      </div>
      {showIdCheck ? (
        <button
          type="button"
          className={`verify-item ${idChecked ? 'checked' : ''}`}
          onClick={() => onChange({ idChecked: !idChecked, paymentChecked })}
        >
          <span>ID Verified (21+ years)</span>
          <span className={`verify-checkbox ${idChecked ? 'checked' : ''}`} aria-hidden>
            {idChecked ? '✓' : ''}
          </span>
        </button>
      ) : (
        <div className="verify-item disabled" aria-disabled="true">
          <span>ID Verified (21+ years)</span>
          <span className="verify-status-text">Not required</span>
        </div>
      )}
      {showPaymentCheck ? (
        <button
          type="button"
          className={`verify-item ${paymentChecked ? 'checked' : ''}`}
          onClick={() => onChange({ idChecked, paymentChecked: !paymentChecked })}
        >
          <span>Payment Verified</span>
          <span className={`verify-checkbox ${paymentChecked ? 'checked' : ''}`} aria-hidden>
            {paymentChecked ? '✓' : ''}
          </span>
        </button>
      ) : (
        <div className="verify-item disabled" aria-disabled="true">
          <span>Payment Verified</span>
          <span className="verify-status-text">Not required</span>
        </div>
      )}
    </div>
  )
}
