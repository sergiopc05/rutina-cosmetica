import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { hasSupabase, supabase } from '@/lib/supabase'
import { initSyncForUser, teardownSync } from '@/db/sync'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (userId) {
      void initSyncForUser(userId)
      return () => teardownSync()
    }
  }, [userId])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    async signInWithEmail(email: string) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      return { error: error?.message ?? null }
    },
    async signOut() {
      await supabase.auth.signOut()
      teardownSync()
    },
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de <AuthProvider>')
  return ctx
}
