import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <h1 className="brand" style={{ margin: 0, marginBottom: 4 }}>Budget</h1>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Sign in to continue</p>

        {error && <div className="flash error" style={{ marginTop: 12 }}>{error}</div>}

        <label className="login-label">
          <span>Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>

        <label className="login-label">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>

        <button className="btn" style={{ width: '100%', marginTop: 16 }} disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="muted" style={{ fontSize: 12, marginTop: 16, marginBottom: 0, lineHeight: 1.5 }}>
          Accounts are provisioned by the owner via the Supabase dashboard. There is no public sign-up.
        </p>
      </form>
    </div>
  )
}
