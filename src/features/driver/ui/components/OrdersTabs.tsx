interface TabOption {
  id: string
  label: string
  badge?: number
}

interface OrdersTabsProps {
  tabs: TabOption[]
  activeId: string
  onChange: (id: string) => void
}

export function OrdersTabs({ tabs, activeId, onChange }: OrdersTabsProps): JSX.Element {
  return (
    <div className="driver-orders__tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`driver-orders__tab${tab.id === activeId ? ' driver-orders__tab--active' : ''}`}
        >
          <span>{tab.label}</span>
          {typeof tab.badge === 'number' && tab.badge > 0 ? (
            <span className="driver-orders__tab-badge" aria-label={`${tab.badge} ${tab.label} orders`}>
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
