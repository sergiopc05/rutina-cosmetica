import { createClient } from '@supabase/supabase-js'
import { env, hasSupabase } from './env'

// Si no hay credenciales usamos valores de relleno: el cliente se construye pero
// cualquier llamada de red fallará. La UI comprueba `hasSupabase` antes de usarlo.
export const supabase = createClient(
  env.supabaseUrl ?? 'http://localhost:54321',
  env.supabaseAnonKey ?? 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
)

export { hasSupabase }

export const PHOTO_BUCKET = 'product-photos'

/**
 * URL de una foto de Storage. El bucket es público (la ruta lleva un UUID
 * imposible de adivinar), así que la URL no caduca y el service worker la
 * cachea de forma fiable para uso offline.
 */
export function photoUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}
