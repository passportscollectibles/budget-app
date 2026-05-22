import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

export const supabase = isConfigured
  ? createClient(url, key)
  : null

if (!isConfigured && typeof window !== 'undefined') {
  console.warn('Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local. Running in local-only mode (data persists to localStorage).')
}
