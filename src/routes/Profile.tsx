import { useAuth } from '../hooks/useAuth'
export default function ProfileRoute(): JSX.Element {
  const { driver, logout } = useAuth()

  return (
    <div className="profile-page">
      <section className="profile-card">
        <h2>Driver Profile</h2>
        <p className="profile-name">{driver?.name}</p>
        <p className="profile-email">{driver?.email}</p>
        <p className="profile-phone">{driver?.phone}</p>
      </section>
      <section className="profile-card">
        <h3>Session</h3>
        <button type="button" className="action-btn danger" onClick={logout}>
          Sign Out
        </button>
      </section>
    </div>
  )
}
