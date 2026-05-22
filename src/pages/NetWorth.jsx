import { useEffect, useMemo, useState } from 'react'
import { accountsApi } from '../lib/db.js'
import { currency } from '../lib/format.js'

const KIND_LABELS = {
  checking: 'Checking',
  savings: 'Savings',
  robinhood: 'Robinhood',
  loan: 'Loan',
  credit_card: 'Credit Card',
}
const KINDS = Object.keys(KIND_LABELS)
const LIABILITIES = new Set(['loan', 'credit_card'])

const blank = { name: '', kind: 'checking', balance: '' }

export default function NetWorth() {
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
      const saved = await accountsApi.upsert({ ...row, balance: Number(row.balance) || 0 })
      setRows(prev => {
        const idx = prev.findIndex(r => r.id === saved.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [...prev, saved]
      })
      setDraft(blank)
    } catch (e) { setError(e.message) }
  }

  async function remove(id) {
    if (!confirm('Delete this account?')) return
    setRows(prev => prev.filter(r => r.id !== id))
    try { await accountsApi.remove(id) } catch (e) { setError(e.message); load() }
  }

  const totals = useMemo(() => {
    const assets = rows.filter(r => !LIABILITIES.has(r.kind)).reduce((s, r) => s + Number(r.balance || 0), 0)
    const liabilities = rows.filter(r => LIABILITIES.has(r.kind)).reduce((s, r) => s + Number(r.balance || 0), 0)
    return { assets, liabilities, net: assets - liabilities }
  }, [rows])

  return (
    <div>
      <div className="page-header"><h2>Net worth</h2></div>
      {error && <div className="flash error">{error}</div>}

      <div className="card-row cols-3" style={{ marginBottom: 20 }}>
        <Stat label="Assets" value={currency(totals.assets)} accent="good" />
        <Stat label="Liabilities" value={currency(totals.liabilities)} accent="bad" />
        <Stat label="Net worth" value={currency(totals.net)} accent={totals.net >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24 }} className="muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24 }} className="muted">No accounts yet — add one below.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th className="text-right">Balance</th>
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
                      {KINDS.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                    </select>
                  </td>
                  <td className="text-right">
                    <input
                      className="input text-right tabular"
                      type="number"
                      step="0.01"
                      defaultValue={a.balance}
                      onBlur={e => save({ ...a, balance: e.target.value })}
                      style={{ maxWidth: 160, marginLeft: 'auto' }}
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
          <input className="input" placeholder="Name (e.g., Chase Checking)" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          <select className="select" value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}>
            {KINDS.map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
          </select>
          <input className="input tabular" placeholder="Balance" type="number" step="0.01" value={draft.balance} onChange={e => setDraft({ ...draft, balance: e.target.value })} />
          <button className="btn" onClick={() => save(draft)} disabled={!draft.name}>Add</button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }) {
  const color = accent === 'good' ? 'var(--good)' : accent === 'bad' ? 'var(--bad)' : 'var(--text)'
  return (
    <div className="card" style={{ margin: 0 }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value tabular" style={{ color }}>{value}</div>
    </div>
  )
}
