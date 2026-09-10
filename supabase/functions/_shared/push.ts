import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

export interface SubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushMessage {
  title: string
  body: string
  tag?: string
  url?: string
}

export interface SendResult {
  endpoint: string
  ok: boolean
  gone: boolean
  status?: number
}

export async function sendPush(
  sub: SubscriptionRow,
  message: PushMessage,
): Promise<SendResult> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(message),
      { TTL: 3600 },
    )
    return { endpoint: sub.endpoint, ok: true, gone: false }
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    return {
      endpoint: sub.endpoint,
      ok: false,
      gone: status === 404 || status === 410,
      status,
    }
  }
}
