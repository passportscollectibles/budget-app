import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/categories.js'
import { currency, netAmount, weekKey, monthKey } from '../lib/format.js'

export default function CategoryBreakdown({ transactions }) {
  const [period, setPeriod] = useState('month')
  const [offset, setOffset] = useState(0) // 0 = current period, 1 = prev, etc.

  const { data, total, periodLabel } = useMemo(() => {
    const keyFn = period === 'week' ? weekKey : monthKey
    const buckets = new Map() // key -> [{cat, net}]
    for (const t of transactions) {
      const k = keyFn(t.date)
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k).push(t)
    }
    const sortedKeys = [...buckets.keys()].sort().reverse()
    const targetKey = sortedKeys[offset]
    const rows = targetKey ? buckets.get(targetKey) : []

    const sums = Object.fromEntries(CATEGORIES.map(c => [c, 0]))
    for (const t of rows) sums[t.category] += netAmount(t)

    const data = CATEGORIES
      .map(c => ({ name: CATEGORY_LABELS[c], cat: c, value: sums[c] }))
      .filter(d => d.value > 0)
    const total = data.reduce((a, b) => a + b.value, 0)
    return { data, total, periodLabel: targetKey || '—' }
  }, [transactions, period, offset])

  const periodOptions = useMemo(() => {
    const keyFn = period === 'week' ? weekKey : monthKey
    const keys = new Set()
    for (const t of transactions) keys.add(keyFn(t.date))
    return [...keys].sort().reverse()
  }, [transactions, period])

  return (
    <div className="card">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Spending by category</h3>
        <div className="row">
          <div className="toggle-group">
            <button className={period === 'week' ? 'active' : ''} onClick={() => { setPeriod('week'); setOffset(0) }}>Weekly</button>
            <button className={period === 'month' ? 'active' : ''} onClick={() => { setPeriod('month'); setOffset(0) }}>Monthly</button>
          </div>
          <select className="select" value={offset} onChange={e => setOffset(Number(e.target.value))}>
            {periodOptions.length === 0
              ? <option value={0}>No data</option>
              : periodOptions.map((k, i) => (
                  <option key={k} value={i}>{k}{i === 0 ? ' (current)' : ''}</option>
                ))}
          </select>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="muted" style={{ padding: '20px 0' }}>No spending in this {period}.</div>
      ) : (
        <div className="card-row cols-2">
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {data.map(d => <Cell key={d.cat} fill={CATEGORY_COLORS[d.cat]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a2332', border: '1px solid #2a3447', borderRadius: 6 }}
                  formatter={(v) => currency(v)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-right tabular" style={{ marginTop: -28, fontSize: 13 }}>
              <div className="muted">Total</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{currency(total)}</div>
            </div>
          </div>
          <div>
            {data.map(d => {
              const pct = total > 0 ? (d.value / total) * 100 : 0
              return (
                <div key={d.cat} className="progress-row">
                  <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: CATEGORY_COLORS[d.cat], display: 'inline-block' }} />
                    {d.name}
                  </div>
                  <div className="progress">
                    <div className="progress-bar" style={{ width: pct + '%', background: CATEGORY_COLORS[d.cat] }} />
                  </div>
                  <div className="amount">{currency(d.value)} <span className="muted">({pct.toFixed(0)}%)</span></div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
