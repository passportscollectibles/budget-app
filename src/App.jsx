import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { isConfigured } from './lib/supabase.js'
import { useAuth } from './lib/auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Transactions from './pages/Transactions.jsx'
import Import from './pages/Import.jsx'
import Accounts from './pages/Accounts.jsx'
import Savings from './pages/Savings.jsx'
import NetWorth from './pages/NetWorth.jsx'
import Login from './pages/Login.jsx'

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transactions' },
  { to: '/import', label: 'Import' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/savings', label: 'Savings' },
  { to: '/networth', label: 'Net Worth' },
]

export default function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <div className="muted" style={{ padding: 40 }}>Loading…</div>
  }

  // When Supabase is configured we require auth. In local-only mode we bypass
  // it so the app stays usable without a backend.
  if (isConfigured && !user) {
    return <Login />
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1 className="brand">Budget</h1>
        <nav>
          {nav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isConfigured && user && (
            <div className="user-block">
              <div className="user-email" title={user.email}>{user.email}</div>
              <button className="btn secondary" style={{ width: '100%' }} onClick={signOut}>Sign out</button>
            </div>
          )}
          {!isConfigured && (
            <div className="env-warning">
              <strong>Local-only mode.</strong>
              <div>Set <code>VITE_SUPABASE_URL</code> &amp; <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code> to persist to Supabase.</div>
            </div>
          )}
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/import" element={<Import />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/networth" element={<NetWorth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
