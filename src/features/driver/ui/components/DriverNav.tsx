import { NavLink } from 'react-router-dom'

export function DriverNav(): JSX.Element {
  return (
    <nav className="driver-shell__nav" aria-label="Primary">
      <NavLink to="/orders" className={({ isActive }) => navClass(isActive)} end>
        <span aria-hidden>📦</span>
        <span>Orders</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => navClass(isActive)}>
        <span aria-hidden>👤</span>
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}

function navClass(isActive: boolean): string {
  return `driver-shell__nav-item${isActive ? ' driver-shell__nav-item--active' : ''}`
}
