import { useEffect, useMemo, useState } from 'react'
import { listTransactions, updateTransaction, deleteTransaction, accountsApi } from '../lib/db.js'
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/categories.js'
import { currency, netAmount } from '../lib/format.js'
import { TYPE_LABELS } from './Accounts.jsx'

export default function Transactions() {
  const [rows, setRows] = useState([])
  const [accounts, setAccounts] = useState([])
  const [filter, setFilter] = useState('all')
  const [scope, setScope] = useState('personal')
  const [accountFilter, setAccountFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [t, a] = await Promise.all([listTransactions(), accountsApi.list()])
      setRows(t)
      setAccounts(a)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function patch(id, change) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...change } : r)))
    try {
      await updateTransaction(id, change)
    } catch (e) {
      setError(e.message)
      load()
    }
  }

  async function remove(id) {
    if (!confirm('Delete this transaction?')) return
    setRows(prev => prev.filter(r => r.id !== id))
    try { await deleteTransaction(id) } catch (e) { setError(e.message); load() }
  }

  const accountsById = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts])

  const filtered = useMemo(() => {
    let r = rows
    if (scope === 'personal') r = r.filter(t => !t.is_business)
    else if (scope === 'business') r = r.filter(t => t.is_business)
    if (filter !== 'all') r = r.filter(t => t.category === filter)
    if (accountFilter !== 'all') {
      if (accountFilter === 'none') r = r.filter(t => !t.account_id)
      else r = r.filter(t => t.account_id === accountFilter)
    }
    return r
  }, [rows, filter, scope, accountFilter])

  function accountLabel(a) {
    if (!a) return ''
    return a.last4 ? `${a.name} ··· ${a.last4}` : a.name
  }

  return (
    <div>
      <div className="page-header">
        <h2>Transactions</h2>
        <div className="row">
          <div className="toggle-group">
            <button className={scope === 'personal' ? 'active' : ''} onClick={() => setScope('personal')}>Personal</button>
            <button className={scope === 'business' ? 'active' : ''} onClick={() => setScope('business')}>Business</button>
            <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>All</button>
          </div>
          <select className="select" value={accountFilter} onChange={e => setAccountFilter(e.target.value)}>
            <option value="all">All accounts</option>
            <option value="none">No account</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
          </select>
          <select className="select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="flash error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24 }} className="muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24 }} className="muted">No transactions match this view.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Account</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Venmoed back</th>
                <th className="text-right">Net</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className={t.is_business ? 'row-business' : ''}>
                  <td style={{ width: 110 }}>
                    <button
                      className={`switch ${t.is_business ? 'on' : ''}`}
                      onClick={() => patch(t.id, { is_business: !t.is_business })}
                      title={t.is_business ? 'Business — click to mark personal' : 'Personal — click to mark business'}
                      aria-label="Toggle business"
                    >
                      <span className="switch-knob" />
                      <span className="switch-label">{t.is_business ? 'Business' : 'Personal'}</span>
                    </button>
                  </td>
                  <td className="tabular">{t.date}</td>
                  <td>
                    <input
                      className="input"
                      value={t.description}
                      onChange={e => setRows(prev => prev.map(r => r.id === t.id ? { ...r, description: e.target.value } : r))}
                      onBlur={e => patch(t.id, { description: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="select"
                      value={t.category}
                      onChange={e => patch(t.id, { category: e.target.value })}
                      style={{ background: CATEGORY_COLORS[t.category] + '22', borderColor: CATEGORY_COLORS[t.category] + '66' }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      className="select"
                      value={t.account_id || ''}
                      onChange={e => patch(t.id, { account_id: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
                    </select>
                  </td>
                  <td className="text-right tabular">{currency(t.amount)}</td>
                  <td className="text-right">
                    <input
                      className="input text-right tabular"
                      type="number"
                      step="0.01"
                      min="0"
                      value={t.venmoed_back ?? 0}
                      onChange={e => setRows(prev => prev.map(r => r.id === t.id ? { ...r, venmoed_back: e.target.value } : r))}
                      onBlur={e => patch(t.id, { venmoed_back: Number(e.target.value) || 0 })}
                      style={{ maxWidth: 100 }}
                    />
                  </td>
                  <td className="text-right tabular" style={{ fontWeight: 600 }}>{currency(netAmount(t))}</td>
                  <td>
                    <button className="btn secondary" onClick={() => remove(t.id)} title="Delete">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
