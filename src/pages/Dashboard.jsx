import { useEffect, useMemo, useState } from 'react'
import { listTransactions, accountsApi, savingsApi } from '../lib/db.js'
import { currency, netAmount, monthKey } from '../lib/format.js'
import CategoryBreakdown from '../components/CategoryBreakdown.jsx'

const CURRENT_YEAR = new Date().getFullYear()
const PREV_YEAR = CURRENT_YEAR - 1

function yearKey(dateStr) {
  return dateStr.slice(0, 4)
}

export default function Dashboard() {
  const [txns, setTxns] = useState([])
  const [accounts, setAccounts] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState('personal') // all | personal | business

  useEffect(() => {
    (async () => {
      try {
        const [t, a, g] = await Promise.all([
          listTransactions(),
          accountsApi.list(),
          savingsApi.list(),
        ])
        setTxns(t); setAccounts(a); setGoals(g)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const scopedTxns = useMemo(() => {
    if (scope === 'personal') return txns.filter(t => !t.is_business)
    if (scope === 'business') return txns.filter(t => t.is_business)
    return txns
  }, [txns, scope])

  const stats = useMemo(() => {
    const thisMonth = monthKey(new Date().toISOString().slice(0, 10))
    const monthSpend = scopedTxns
      .filter(t => monthKey(t.date) === thisMonth)
      .reduce((a, t) => a + netAmount(t), 0)
    const ytd = scopedTxns
      .filter(t => yearKey(t.date) === String(CURRENT_YEAR))
      .reduce((a, t) => a + netAmount(t), 0)
    const prevYearTxns = scopedTxns.filter(t => yearKey(t.date) === String(PREV_YEAR))
    const prevYear = prevYearTxns.reduce((a, t) => a + netAmount(t), 0)
    const venmoBack = scopedTxns.reduce((a, t) => a + Number(t.venmoed_back || 0), 0)

    const assetKinds = new Set(['checking', 'savings', 'robinhood'])
    const liabKinds = new Set(['loan', 'credit_card'])
    const assets = accounts.filter(a => assetKinds.has(a.kind)).reduce((s, a) => s + Number(a.balance || 0), 0)
    const liabilities = accounts.filter(a => liabKinds.has(a.kind)).reduce((s, a) => s + Number(a.balance || 0), 0)
    const netWorth = assets - liabilities

    return {
      monthSpend,
      ytd,
      prevYear,
      hasPrevYear: prevYearTxns.length > 0,
      venmoBack,
      netWorth,
      monthLabel: thisMonth,
    }
  }, [scopedTxns, accounts])

  if (loading) return <div className="muted">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="toggle-group">
          <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>All</button>
          <button className={scope === 'personal' ? 'active' : ''} onClick={() => setScope('personal')}>Personal</button>
          <button className={scope === 'business' ? 'active' : ''} onClick={() => setScope('business')}>Business</button>
        </div>
      </div>

      <div className="card-row cols-3" style={{ marginBottom: 20 }}>
        <Stat label={`Spent in ${stats.monthLabel}`} value={currency(stats.monthSpend)} />
        <Stat label={`${CURRENT_YEAR} YTD`} value={currency(stats.ytd)} />
        {stats.hasPrevYear && <Stat label={`${PREV_YEAR} full year`} value={currency(stats.prevYear)} />}
        <Stat label="Venmoed back (all time)" value={currency(stats.venmoBack)} accent="good" />
        <Stat label="Net worth" value={currency(stats.netWorth)} accent={stats.netWorth >= 0 ? 'good' : 'bad'} />
      </div>

      <CategoryBreakdown transactions={scopedTxns} />

      {goals.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Savings goals</h3>
          {goals.map(g => {
            const pct = Number(g.target_amount) > 0 ? (Number(g.current_amount) / Number(g.target_amount)) * 100 : 0
            return (
              <div key={g.id} className="progress-row">
                <div className="label">{g.name}</div>
                <div className="progress"><div className="progress-bar" style={{ width: Math.min(100, pct) + '%', background: 'var(--accent)' }} /></div>
                <div className="amount">{currency(g.current_amount)} / {currency(g.target_amount)}</div>
              </div>
            )
          })}
        </div>
      )}
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
