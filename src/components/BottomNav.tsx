import { NavLink } from 'react-router-dom'

export function BottomNav(): JSX.Element {
  return (
    <nav className="driver-shell__nav">
      <NavLink
        to="/orders"
        className={({ isActive }) =>
          ['driver-shell__nav-item', isActive && 'driver-shell__nav-item--active']
            .filter(Boolean)
            .join(' ')
        }
        end
      >
        <span role="img" aria-hidden>
          📦
        </span>
        <span>Orders</span>
      </NavLink>
      <NavLink
        to="/profile"
        className={({ isActive }) =>
          ['driver-shell__nav-item', isActive && 'driver-shell__nav-item--active']
            .filter(Boolean)
            .join(' ')
        }
      >
        <span role="img" aria-hidden>
          👤
        </span>
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}
