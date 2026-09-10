// Envía por Web Push los avisos vencidos de notification_queue.
// - Sin cuerpo / {} -> modo cron (cada minuto).
// - {"test": true} con JWT de usuario -> envía una notificación de prueba a ese usuario.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { adminClient, corsHeaders, json } from '../_shared/supabaseAdmin.ts'
import { sendPush, type SendResult, type SubscriptionRow } from '../_shared/push.ts'

type Admin = ReturnType<typeof adminClient>

async function activeSubs(
  admin: Admin,
  userId: string,
): Promise<SubscriptionRow[]> {
  const { data } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
    .is('deleted_at', null)
  return (data ?? []) as SubscriptionRow[]
}

async function cleanupGone(admin: Admin, results: SendResult[]): Promise<void> {
  const gone = results.filter((r) => r.gone).map((r) => r.endpoint)
  if (gone.length) {
    await admin
      .from('push_subscriptions')
      .update({ deleted_at: new Date().toISOString() })
      .in('endpoint', gone)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const admin = adminClient()

  let isTest = false
  try {
    const body = await req.json()
    isTest = Boolean(body?.test)
  } catch {
    /* el cron llama sin cuerpo */
  }

  // ---- Modo prueba -------------------------------------------------------
  if (isTest) {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    )
    const { data: auth } = await userClient.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return json({ ok: false, message: 'No autenticado' }, 401)

    const subs = await activeSubs(admin, userId)
    if (subs.length === 0) {
      return json({
        ok: false,
        message: 'Sin dispositivos suscritos. Activa los avisos primero.',
      })
    }
    const results = await Promise.all(
      subs.map((s) =>
        sendPush(s, {
          title: 'Notificación de prueba ✅',
          body: 'Si ves esto, los avisos funcionan.',
          tag: 'test',
          url: '/',
        }),
      ),
    )
    await cleanupGone(admin, results)
    const ok = results.some((r) => r.ok)
    return json({
      ok,
      message: ok
        ? 'Enviada. Debería llegarte en unos segundos.'
        : 'No se pudo entregar a ningún dispositivo.',
    })
  }

  // ---- Modo cron -------------------------------------------------------
  const { data: due } = await admin
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(200)

  let sent = 0
  let failed = 0

  for (const n of due ?? []) {
    const subs = await activeSubs(admin, n.user_id)
    if (subs.length === 0) {
      await admin
        .from('notification_queue')
        .update({ status: 'skipped' })
        .eq('id', n.id)
      continue
    }

    const results = await Promise.all(
      subs.map((s) =>
        sendPush(s, {
          title: n.title,
          body: n.body,
          tag: `rutina-${n.for_date}`,
          url: '/',
        }),
      ),
    )
    await cleanupGone(admin, results)

    const anyOk = results.some((r) => r.ok)
    const attempts = (n.attempts ?? 0) + 1
    const status = anyOk ? 'sent' : attempts >= 3 ? 'failed' : 'pending'
    await admin
      .from('notification_queue')
      .update({
        status,
        attempts,
        sent_at: anyOk ? new Date().toISOString() : null,
      })
      .eq('id', n.id)

    if (anyOk) sent++
    else failed++
  }

  return json({ ok: true, processed: (due ?? []).length, sent, failed })
})
