import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Cliente aislado para sign-up de nuevos usuarios.
// Usa la anon key (no service role) y no persiste sesión,
// así no reemplaza la sesión del admin actual.
export const supabaseSignup = createClient(url, key, {
  auth: {
    persistSession:    false,
    autoRefreshToken:  false,
    detectSessionInUrl: false,
  },
})
