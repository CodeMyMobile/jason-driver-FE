import { NavLink } from 'react-router-dom'

export function BottomNav(): JSX.Element {
  return (
    <nav className="bottom-nav">
      <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <span role="img" aria-hidden>
          📦
        </span>
        <span>Orders</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span role="img" aria-hidden>
          👤
        </span>
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}
