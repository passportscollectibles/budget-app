// Thin data layer. Uses Supabase when configured; falls back to localStorage so
// the app is usable before Supabase is wired up.
import { supabase, isConfigured } from './supabase.js'

const KEYS = {
  transactions: 'budget.transactions',
  savings_goals: 'budget.savings_goals',
  accounts: 'budget.accounts',
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function readLocal(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function writeLocal(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows))
}

// ---------- Transactions ----------
export async function listTransactions() {
  if (isConfigured) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
    if (error) throw error
    return data
  }
  return readLocal(KEYS.transactions).sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function insertTransactions(rows) {
  const prepared = rows.map(r => ({
    id: r.id || uuid(),
    date: r.date,
    description: r.description,
    amount: Number(r.amount),
    category: r.category,
    venmoed_back: Number(r.venmoed_back || 0),
    is_business: Boolean(r.is_business),
    account_id: r.account_id || null,
  }))
  if (isConfigured) {
    const { data, error } = await supabase.from('transactions').insert(prepared).select()
    if (error) throw error
    return data
  }
  const existing = readLocal(KEYS.transactions)
  writeLocal(KEYS.transactions, [...prepared, ...existing])
  return prepared
}

export async function updateTransaction(id, patch) {
  if (isConfigured) {
    const { data, error } = await supabase
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const rows = readLocal(KEYS.transactions)
  const next = rows.map(r => (r.id === id ? { ...r, ...patch } : r))
  writeLocal(KEYS.transactions, next)
  return next.find(r => r.id === id)
}

export async function deleteTransaction(id) {
  if (isConfigured) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    return
  }
  writeLocal(KEYS.transactions, readLocal(KEYS.transactions).filter(r => r.id !== id))
}

// ---------- Generic CRUD for savings / accounts ----------
function makeCrud(table, localKey) {
  return {
    async list() {
      if (isConfigured) {
        const { data, error } = await supabase.from(table).select('*')
        if (error) throw error
        return data
      }
      return readLocal(localKey)
    },
    async upsert(row) {
      const prepared = { ...row, id: row.id || uuid() }
      if (isConfigured) {
        const { data, error } = await supabase.from(table).upsert(prepared).select().single()
        if (error) throw error
        return data
      }
      const rows = readLocal(localKey)
      const idx = rows.findIndex(r => r.id === prepared.id)
      if (idx >= 0) rows[idx] = prepared
      else rows.push(prepared)
      writeLocal(localKey, rows)
      return prepared
    },
    async remove(id) {
      if (isConfigured) {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
        return
      }
      writeLocal(localKey, readLocal(localKey).filter(r => r.id !== id))
    },
  }
}

export const savingsApi = makeCrud('savings_goals', KEYS.savings_goals)
export const accountsApi = makeCrud('accounts', KEYS.accounts)
