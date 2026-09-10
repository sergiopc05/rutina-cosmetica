import { env, hasPush } from './env'
import { supabase } from './supabase'
import { nowISO } from './util'

export type PushStatus =
  | 'unsupported'
  | 'not-configured'
  | 'ios-needs-install'
  | 'default'
  | 'granted'
  | 'denied'

export function pushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function pushStatus(): PushStatus {
  if (!pushSupported()) return 'unsupported'
  if (!hasPush) return 'not-configured'
  if (isIos() && !isStandalone()) return 'ios-needs-install'
  return Notification.permission as 'default' | 'granted' | 'denied'
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function platform(): string {
  if (isIos()) return 'ios'
  if (/Android/.test(navigator.userAgent)) return 'android'
  return 'web'
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const { data } = await supabase.auth.getUser()
  const userId = data.user?.id
  if (!userId) return
  const json = sub.toJSON()
  await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      user_agent: navigator.userAgent.slice(0, 400),
      platform: platform(),
      updated_at: nowISO(),
      deleted_at: null,
    },
    { onConflict: 'endpoint' },
  )
}

export async function enablePush(): Promise<{ ok: boolean; status: PushStatus }> {
  const pre = pushStatus()
  if (pre === 'unsupported' || pre === 'not-configured' || pre === 'ios-needs-install') {
    return { ok: false, status: pre }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, status: 'denied' }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey as string),
    })
  }
  await saveSubscription(sub)
  return { ok: true, status: 'granted' }
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await supabase
    .from('push_subscriptions')
    .update({ deleted_at: nowISO(), updated_at: nowISO() })
    .eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Pide al backend que envíe una notificación de prueba a este usuario. */
export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, message: 'Sesión no válida.' }
  try {
    const res = await fetch(
      `${env.supabaseUrl}/functions/v1/dispatch-notifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      },
    )
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    return {
      ok: res.ok,
      message: body.message ?? (res.ok ? 'Enviada.' : `Error ${res.status}`),
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Error de red' }
  }
}
