interface TabOption {
  id: string
  label: string
  badge?: number
}

interface TabsProps {
  tabs: TabOption[]
  activeId: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, activeId, onChange }: TabsProps): JSX.Element {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`tab ${tab.id === activeId ? 'active' : ''}`}
        >
          <span>{tab.label}</span>
          {typeof tab.badge === 'number' && tab.badge > 0 ? <span className="tab-badge">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}
