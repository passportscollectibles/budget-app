import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { Link } from 'react-router-dom'
import { insertTransactions, accountsApi } from '../lib/db.js'
import { CATEGORIES, isValidCategory } from '../lib/categories.js'
import { TYPE_LABELS } from './Accounts.jsx'

const SAMPLE_JSON = `[
  {"date":"2026-05-12","desc":"Trader Joe's","amount":42.13,"cat":"food","venmo":0},
  {"date":"2026-05-13","desc":"Uber","amount":18.50,"cat":"transport","venmo":9.25},
  {"date":"2026-05-14","desc":"Client lunch","amount":68.00,"cat":"food","venmo":0,"is_business":true}
]`

function toBool(v) {
  if (typeof v === 'boolean') return v
  if (v == null || v === '') return false
  const s = String(v).trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'y'
}

function normalize(rows, accountId) {
  const out = []
  const errors = []
  rows.forEach((r, i) => {
    const date = r.date
    const description = r.desc ?? r.description
    const amount = Number(r.amount)
    const category = (r.cat ?? r.category ?? '').toLowerCase()
    const venmoed_back = Number(r.venmo ?? r.venmoed_back ?? 0)
    const is_business = toBool(r.is_business ?? r.business)
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { errors.push(`Row ${i + 1}: invalid date "${date}"`); return }
    if (!description) { errors.push(`Row ${i + 1}: missing description`); return }
    if (Number.isNaN(amount)) { errors.push(`Row ${i + 1}: invalid amount`); return }
    if (!isValidCategory(category)) { errors.push(`Row ${i + 1}: invalid category "${category}" (allowed: ${CATEGORIES.join(', ')})`); return }
    out.push({
      date,
      description,
      amount,
      category,
      venmoed_back: Number.isNaN(venmoed_back) ? 0 : venmoed_back,
      is_business,
      account_id: accountId,
    })
  })
  return { rows: out, errors }
}

export default function Import() {
  const [json, setJson] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const list = await accountsApi.list()
        setAccounts(list)
        if (list.length === 1) setAccountId(list[0].id)
      } catch (e) {
        setStatus({ kind: 'error', text: 'Could not load accounts: ' + e.message })
      }
    })()
  }, [])

  function accountLabel(a) {
    const kind = TYPE_LABELS[a.kind] || a.kind
    return a.last4 ? `${a.name} · ${kind} ··· ${a.last4}` : `${a.name} · ${kind}`
  }

  async function importJson() {
    setStatus(null)
    if (!accountId) {
      setStatus({ kind: 'error', text: 'Pick an account before importing.' })
      return
    }
    let parsed
    try {
      parsed = JSON.parse(json)
    } catch (e) {
      setStatus({ kind: 'error', text: 'Invalid JSON: ' + e.message })
      return
    }
    if (!Array.isArray(parsed)) {
      setStatus({ kind: 'error', text: 'Top-level value must be an array.' })
      return
    }
    const { rows, errors } = normalize(parsed, accountId)
    if (errors.length) {
      setStatus({ kind: 'error', text: errors.slice(0, 6).join('\n') + (errors.length > 6 ? `\n…and ${errors.length - 6} more` : '') })
      return
    }
    setBusy(true)
    try {
      await insertTransactions(rows)
      setStatus({ kind: 'success', text: `Imported ${rows.length} transaction${rows.length === 1 ? '' : 's'}.` })
      setJson('')
    } catch (e) {
      setStatus({ kind: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  function importCsv(file) {
    setStatus(null)
    if (!accountId) {
      setStatus({ kind: 'error', text: 'Pick an account before importing.' })
      return
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const { rows, errors } = normalize(result.data, accountId)
        if (errors.length) {
          setStatus({ kind: 'error', text: errors.slice(0, 6).join('\n') + (errors.length > 6 ? `\n…and ${errors.length - 6} more` : '') })
          return
        }
        setBusy(true)
        try {
          await insertTransactions(rows)
          setStatus({ kind: 'success', text: `Imported ${rows.length} transaction${rows.length === 1 ? '' : 's'} from CSV.` })
        } catch (e) {
          setStatus({ kind: 'error', text: e.message })
        } finally {
          setBusy(false)
        }
      },
      error: (err) => setStatus({ kind: 'error', text: 'CSV parse error: ' + err.message }),
    })
  }

  const noAccounts = accounts.length === 0
  const canImport = Boolean(accountId) && !busy

  return (
    <div>
      <div className="page-header">
        <h2>Import transactions</h2>
      </div>

      {status && (
        <div className={`flash ${status.kind}`} style={{ whiteSpace: 'pre-wrap' }}>{status.text}</div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Account</h3>
        {noAccounts ? (
          <div className="muted">
            You don't have any accounts yet. <Link to="/accounts">Add one</Link> before importing.
          </div>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>All transactions in this import will be tagged to the account you pick below.</p>
            <select className="select" value={accountId} onChange={e => setAccountId(e.target.value)} style={{ minWidth: 280 }}>
              <option value="">— Pick an account —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
            </select>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Paste JSON</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Format: <code>{`[{"date":"YYYY-MM-DD","desc":"...","amount":n,"cat":"food|transport|shopping|health|entertainment|utilities|other","venmo":0,"is_business":false}]`}</code>
        </p>
        <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>
          <code>is_business</code> is optional (defaults to <code>false</code>). Accepts <code>true/false</code>, <code>"yes"/"no"</code>, or <code>1/0</code>. The key <code>business</code> also works.
        </p>
        <textarea
          value={json}
          onChange={e => setJson(e.target.value)}
          placeholder={SAMPLE_JSON}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={importJson} disabled={!canImport || !json.trim()}>Import JSON</button>
          <button className="btn secondary" onClick={() => setJson(SAMPLE_JSON)} disabled={busy}>Load sample</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Upload CSV</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Columns: <code>date, desc (or description), amount, cat (or category), venmo (or venmoed_back), is_business (or business)</code>
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={e => e.target.files?.[0] && importCsv(e.target.files[0])}
          disabled={!canImport}
        />
      </div>
    </div>
  )
}
