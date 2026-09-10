import { hasSupabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/features/auth/LoginPage'
import { NotConfiguredPage } from '@/features/auth/NotConfiguredPage'
import { AuthProvider, useAuth } from './AuthProvider'

function Gate() {
  const { session, loading } = useAuth()

  if (!hasSupabase) return <NotConfiguredPage />
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }
  if (!session) return <LoginPage />
  return <Layout />
}

export function RootLayout() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
