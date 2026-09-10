import { useEffect, useState } from 'react'
import { Button, Card, Spinner } from '@/components/ui'
import {
  disablePush,
  enablePush,
  isIos,
  pushStatus,
  sendTestPush,
  type PushStatus,
} from '@/lib/push'

export function NotificationsCard() {
  const [status, setStatus] = useState<PushStatus>('default')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setStatus(pushStatus())
  }, [])

  async function onEnable() {
    setBusy(true)
    setMsg(null)
    const res = await enablePush()
    setStatus(res.status)
    if (res.ok) setMsg('Avisos activados en este dispositivo.')
    setBusy(false)
  }

  async function onDisable() {
    setBusy(true)
    await disablePush()
    setStatus(pushStatus())
    setMsg('Avisos desactivados en este dispositivo.')
    setBusy(false)
  }

  async function onTest() {
    setBusy(true)
    setMsg('Enviando…')
    const res = await sendTestPush()
    setMsg(res.message)
    setBusy(false)
  }

  return (
    <Card>
      <h3 className="font-semibold">Notificaciones</h3>

      {status === 'unsupported' && (
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          Este navegador no admite notificaciones push.
        </p>
      )}

      {status === 'not-configured' && (
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          Falta la clave VAPID (<code>VITE_VAPID_PUBLIC_KEY</code>). Consulta el
          README.
        </p>
      )}

      {status === 'ios-needs-install' && (
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          En iPhone primero instala la app: pulsa <strong>Compartir</strong> →{' '}
          <strong>Añadir a pantalla de inicio</strong>, abre la app desde el icono
          y vuelve aquí.
        </p>
      )}

      {status === 'denied' && (
        <p className="mt-1 text-sm text-black/55 dark:text-white/55">
          Permiso bloqueado. Actívalo en los ajustes del navegador para este sitio.
        </p>
      )}

      {(status === 'default' || status === 'granted') && (
        <div className="mt-2 space-y-2">
          {status === 'granted' ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onTest} disabled={busy}>
                {busy ? <Spinner /> : 'Enviar prueba'}
              </Button>
              <Button variant="ghost" onClick={onDisable} disabled={busy}>
                Desactivar
              </Button>
            </div>
          ) : (
            <Button onClick={onEnable} disabled={busy}>
              {busy ? <Spinner /> : 'Activar avisos en este dispositivo'}
            </Button>
          )}
          {isIos() && (
            <p className="text-xs text-black/45 dark:text-white/45">
              En iPhone el aviso llega a la hora exacta solo si el móvil tiene
              internet; puede retrasarse unos minutos.
            </p>
          )}
        </div>
      )}

      {msg && (
        <p className="mt-2 text-sm text-brand-700 dark:text-brand-300">{msg}</p>
      )}
    </Card>
  )
}
