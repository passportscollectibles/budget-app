import { useEffect, useState } from 'react'
import { accountsApi } from '../lib/db.js'

const TYPE_LABELS = {
  credit_card: 'Credit Card',
  checking: 'Checking',
  savings: 'Savings',
  other: 'Other',
  // Kept for compatibility with the Net Worth page, which can create these.
  robinhood: 'Robinhood',
  loan: 'Loan',
}
// Order shown in the dropdown. The four the user picks from go first.
const TYPE_OPTIONS = ['credit_card', 'checking', 'savings', 'other', 'robinhood', 'loan']

const blank = { name: '', kind: 'credit_card', last4: '' }

function cleanLast4(v) {
  const digits = String(v || '').replace(/\D/g, '').slice(0, 4)
  return digits
}

export default function Accounts() {
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState(blank)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try { setRows(await accountsApi.list()); setError(null) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function save(row) {
    try {
      const saved = await accountsApi.upsert({
        ...row,
        last4: row.last4 ? cleanLast4(row.last4) : null,
      })
      setRows(prev => {
        const idx = prev.findIndex(r => r.id === saved.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [...prev, saved]
      })
      if (row === draft || row.id === draft.id) setDraft(blank)
    } catch (e) { setError(e.message) }
  }

  async function remove(id) {
    if (!confirm('Delete this account? Transactions tagged with it will be left without an account.')) return
    setRows(prev => prev.filter(r => r.id !== id))
    try { await accountsApi.remove(id) } catch (e) { setError(e.message); load() }
  }

  return (
    <div>
      <div className="page-header"><h2>Accounts</h2></div>
      {error && <div className="flash error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24 }} className="muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24 }} className="muted">No accounts yet — add one below.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Last 4</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id}>
                  <td>
                    <input className="input" defaultValue={a.name} onBlur={e => save({ ...a, name: e.target.value })} />
                  </td>
                  <td>
                    <select className="select" value={a.kind} onChange={e => save({ ...a, kind: e.target.value })}>
                      {TYPE_OPTIONS.map(k => <option key={k} value={k}>{TYPE_LABELS[k]}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input tabular"
                      placeholder="——"
                      defaultValue={a.last4 || ''}
                      maxLength={4}
                      onBlur={e => save({ ...a, last4: cleanLast4(e.target.value) })}
                      style={{ maxWidth: 100 }}
                    />
                  </td>
                  <td><button className="btn secondary" onClick={() => remove(a.id)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add account</h3>
        <div className="row">
          <input className="input" placeholder="Name (e.g., Chase Sapphire)" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          <select className="select" value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}>
            {TYPE_OPTIONS.map(k => <option key={k} value={k}>{TYPE_LABELS[k]}</option>)}
          </select>
          <input className="input tabular" placeholder="Last 4 (optional)" value={draft.last4} maxLength={4} onChange={e => setDraft({ ...draft, last4: cleanLast4(e.target.value) })} style={{ maxWidth: 140 }} />
          <button className="btn" onClick={() => save(draft)} disabled={!draft.name.trim()}>Add</button>
        </div>
      </div>
    </div>
  )
}

export { TYPE_LABELS, TYPE_OPTIONS }
