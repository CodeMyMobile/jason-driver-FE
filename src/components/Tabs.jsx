export default function Tabs({ tabs, activeId, onChange }) {
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
          {typeof tab.badge === 'number' && tab.badge > 0 ? (
            <span className="tab-badge">{tab.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
