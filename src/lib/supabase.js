import { createClient } from '@supabase/supabase-js'

// Values pasted into a dashboard pick up stray whitespace and line breaks. A key
// containing either produces an invalid HTTP header, so fetch throws before the
// request is sent ("Load failed" in Safari) — which looks like the server is down.
// Supabase project URLs are always *.supabase.co. A ".com" typo resolves to
// nothing, so the request dies at DNS (ERR_NAME_NOT_RESOLVED / "Load failed")
// and looks like the service is down. Correct it rather than fail.
const normalizeSupabaseUrl = (value) => {
  const fixed = value.replace(/^(https?:\/\/[a-z0-9-]+\.supabase)\.com(?=\/|$)/i, '$1.co')
  if (fixed !== value) {
    console.warn(`VITE_SUPABASE_URL points at ${value} — using ${fixed}. Fix it in the Pages settings.`)
  }
  return fixed
}

const supabaseUrl = normalizeSupabaseUrl((import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, ''))
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').replace(/\s/g, '')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in environment variables') 
}

// The dashboard value often arrives with a trailing slash or stray whitespace.
// Normalize once here so every auth redirect uses the same canonical origin and
// only one URL needs to sit on the Supabase redirect allowlist.
export const appOrigin = (import.meta.env.VITE_TELLO_DOMAIN || 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    redirectTo: appOrigin,
  },
})
