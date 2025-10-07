import { NavLink } from 'react-router-dom'

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span role="img" aria-hidden="true">
          📦
        </span>
        <span>Orders</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span role="img" aria-hidden="true">
          👤
        </span>
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}
