interface ChecklistItem {
  key: string
  label: string
  checked: boolean
}

interface VerifyChecklistProps {
  items: ChecklistItem[]
  onToggle: (key: string) => void
}

export function VerifyChecklist({ items, onToggle }: VerifyChecklistProps) {
  return (
    <div className="verify-section">
      <div className="verify-header">
        <h3>Required Verifications</h3>
      </div>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="verify-item"
          onClick={() => onToggle(item.key)}
          aria-pressed={item.checked}
        >
          <span>{item.label}</span>
          <span className={`verify-checkbox ${item.checked ? 'checked' : ''}`} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
