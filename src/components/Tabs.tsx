import type { ReactNode } from 'react'

interface TabItem {
  key: string
  label: string
  badge?: number
}

interface TabsProps {
  items: TabItem[]
  activeKey: string
  onChange: (key: string) => void
}

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="tabs">
      {items.map((item) => {
        const isActive = item.key === activeKey
        return (
          <button
            key={item.key}
            type="button"
            className={`tab ${isActive ? 'active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <span>{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 ? <span className="tab-badge">{item.badge}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

interface TabPanelProps {
  active: boolean
  children: ReactNode
}

export function TabPanel({ active, children }: TabPanelProps) {
  return <section className={`content-section ${active ? 'active' : ''}`}>{children}</section>
}
