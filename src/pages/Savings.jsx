import { useEffect, useState } from 'react'
import { savingsApi } from '../lib/db.js'
import { currency } from '../lib/format.js'

const blank = { name: '', target_amount: '', current_amount: '', target_date: '' }

export default function Savings() {
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState(blank)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try { setRows(await savingsApi.list()); setError(null) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function save(row) {
    try {
      const saved = await savingsApi.upsert({
        ...row,
        target_amount: Number(row.target_amount) || 0,
        current_amount: Number(row.current_amount) || 0,
        target_date: row.target_date || null,
      })
      setRows(prev => {
        const idx = prev.findIndex(r => r.id === saved.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [...prev, saved]
      })
      setDraft(blank)
    } catch (e) { setError(e.message) }
  }

  async function remove(id) {
    if (!confirm('Delete this goal?')) return
    setRows(prev => prev.filter(r => r.id !== id))
    try { await savingsApi.remove(id) } catch (e) { setError(e.message); load() }
  }

  return (
    <div>
      <div className="page-header"><h2>Savings goals</h2></div>
      {error && <div className="flash error">{error}</div>}

      <div className="card">
        {loading ? <div className="muted">Loading…</div> : rows.length === 0 ? (
          <div className="muted">No goals yet — add one below.</div>
        ) : rows.map(g => {
          const pct = Number(g.target_amount) > 0 ? (Number(g.current_amount) / Number(g.target_amount)) * 100 : 0
          return (
            <div key={g.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{g.name}</strong>
                <div className="muted tabular">{g.target_date ? `by ${g.target_date}` : ''}</div>
              </div>
              <div className="progress-row" style={{ gridTemplateColumns: '1fr 220px' }}>
                <div className="progress"><div className="progress-bar" style={{ width: Math.min(100, pct) + '%', background: 'var(--accent)' }} /></div>
                <div className="amount">{currency(g.current_amount)} / {currency(g.target_amount)} ({pct.toFixed(0)}%)</div>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <label className="muted" style={{ fontSize: 12 }}>Current:</label>
                <input
                  className="input tabular"
                  type="number"
                  step="0.01"
                  defaultValue={g.current_amount}
                  onBlur={e => save({ ...g, current_amount: e.target.value })}
                  style={{ maxWidth: 140 }}
                />
                <button className="btn secondary" onClick={() => remove(g.id)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add goal</h3>
        <div className="row">
          <input className="input" placeholder="Name (e.g., Emergency fund)" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          <input className="input" placeholder="Target $" type="number" step="0.01" value={draft.target_amount} onChange={e => setDraft({ ...draft, target_amount: e.target.value })} />
          <input className="input" placeholder="Current $" type="number" step="0.01" value={draft.current_amount} onChange={e => setDraft({ ...draft, current_amount: e.target.value })} />
          <input className="input" type="date" value={draft.target_date} onChange={e => setDraft({ ...draft, target_date: e.target.value })} />
          <button className="btn" onClick={() => save(draft)} disabled={!draft.name || !draft.target_amount}>Add</button>
        </div>
      </div>
    </div>
  )
}
