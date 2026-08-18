import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
