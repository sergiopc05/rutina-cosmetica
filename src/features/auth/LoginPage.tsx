import { useEffect, useState, type FormEvent } from 'react'
import { env } from '@/lib/env'
import { Button, Spinner, TextInput } from '@/components/ui'
import { useAuth } from '@/app/AuthProvider'

export function LoginPage() {
  const { signInWithEmail, verifyEmailCode } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

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

  async function onVerifyCode(e: FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setCodeError(null)
    const { error } = await verifyEmailCode(email.trim(), code)
    setVerifying(false)
    if (error) setCodeError('Código incorrecto o caducado. Pide uno nuevo.')
    // Si no hay error, la sesión se activa sola (onAuthStateChange) y se sale del login.
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <img
          src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
          alt=""
          className="mx-auto mb-3 h-16 w-16 rounded-2xl object-cover shadow-sm"
        />
        <h1 className="text-2xl font-bold tracking-tight">{env.appName}</h1>
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          Tus rutinas de tratamientos, sincronizadas y con avisos a la hora.
        </p>
      </div>

      {state === 'sent' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            <p className="font-semibold">Revisa tu correo</p>
            <p className="mt-1">
              Te hemos enviado un enlace y un código a <strong>{email}</strong>.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <p className="font-semibold">¿Instalaste la app en el iPhone?</p>
            <p className="mt-1">
              No toques el enlace del correo: se abre en Safari, no dentro de la
              app instalada, y no podrás entrar. Usa el <strong>código de 6
              dígitos</strong> de abajo.
            </p>
          </div>

          <form onSubmit={onVerifyCode} className="space-y-2">
            <TextInput
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Código de 6 dígitos"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={verifying || !code}>
              {verifying ? <Spinner /> : 'Confirmar código'}
            </Button>
            {codeError && <p className="text-sm text-red-600">{codeError}</p>}
          </form>

          <button
            className="w-full text-center text-xs underline disabled:opacity-50"
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
            Sin contraseña: te enviamos un enlace y un código por email.
          </p>
        </form>
      )}
    </div>
  )
}
