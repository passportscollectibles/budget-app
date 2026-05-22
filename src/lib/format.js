export function currency(n) {
  const v = Number(n) || 0
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function netAmount(t) {
  return Number(t.amount) - Number(t.venmoed_back || 0)
}

// ISO week start (Mon) for a given date.
export function weekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = (d.getDay() + 6) % 7 // Mon = 0
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

export function monthKey(dateStr) {
  return dateStr.slice(0, 7) // YYYY-MM
}
