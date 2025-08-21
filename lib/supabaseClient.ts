// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Enable automatic session persistence
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Store session in localStorage (default)
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    // Optional: Custom storage key
    storageKey: 'sb-auth-token',
    // Optional: Set token refresh margin
    flowType: 'pkce'
  }
})