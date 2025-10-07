import type { MouseEvent } from 'react'

interface DriverTabsProps {
  activeId: 'assigned' | 'in-progress' | 'completed'
  onSelect?: (id: DriverTabsProps['activeId']) => void
}

const tabs: { id: DriverTabsProps['activeId']; label: string }[] = [
  { id: 'assigned', label: 'Assigned' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
]

export function DriverTabs({ activeId, onSelect }: DriverTabsProps): JSX.Element {
  const handleClick = (event: MouseEvent<HTMLButtonElement>, id: DriverTabsProps['activeId']) => {
    event.preventDefault()
    onSelect?.(id)
  }

  return (
    <div className="driver-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`driver-tab ${tab.id === activeId ? 'active' : ''}`.trim()}
          onClick={(event) => handleClick(event, tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
