const raw = import.meta.env

const trimSlash = (s: string | undefined) => s?.replace(/\/+$/, '') || undefined

export const env = {
  supabaseUrl: trimSlash(raw.VITE_SUPABASE_URL as string | undefined),
  supabaseAnonKey: (raw.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim(),
  vapidPublicKey: raw.VITE_VAPID_PUBLIC_KEY as string | undefined,
  appName: (raw.VITE_APP_NAME as string | undefined) ?? 'Rutina Cosmética',
}

/** true cuando hay credenciales de Supabase configuradas. */
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey)

/** true cuando se puede pedir suscripción a Web Push. */
export const hasPush = Boolean(env.vapidPublicKey) && hasSupabase
