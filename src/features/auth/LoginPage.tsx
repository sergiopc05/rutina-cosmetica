import { useEffect, useState, type FormEvent } from 'react'
import { env } from '@/lib/env'
import { Button, Spinner, TextInput } from '@/components/ui'
import { useAuth } from '@/app/AuthProvider'

export function LoginPage() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (cooldown > 0) return
    setState('sending')
    setError(null)
    const { error } = await signInWithEmail(email.trim())
    // Supabase limita a 1 envío / 60 s por correo (y el servicio integrado a
    // ~2/hora). Reflejamos la espera para no gastar la cuota por error.
    setCooldown(60)
    if (error) {
      setError(
        /rate limit/i.test(error)
          ? 'Límite de correos alcanzado. Espera un rato o configura SMTP propio (ver README).'
          : error,
      )
      setState('error')
    } else {
      setState('sent')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-3xl dark:bg-brand-900/40">
          🧴
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{env.appName}</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          Tus rutinas de tratamientos, sincronizadas y con avisos a la hora.
        </p>
      </div>

      {state === 'sent' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <p className="font-semibold">Revisa tu correo</p>
          <p className="mt-1">
            Te hemos enviado un enlace de acceso a <strong>{email}</strong>. Ábrelo
            en este mismo dispositivo.
          </p>
          <button
            className="mt-3 text-xs underline disabled:opacity-50"
            onClick={() => setState('idle')}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Usar otro correo'}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={state === 'sending' || cooldown > 0}
          >
            {state === 'sending' ? (
              <Spinner />
            ) : cooldown > 0 ? (
              `Espera ${cooldown}s`
            ) : (
              'Enviar enlace de acceso'
            )}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-center text-xs text-black/45 dark:text-white/45">
            Sin contraseña: te enviamos un enlace mágico por email.
          </p>
        </form>
      )}
    </div>
  )
}
