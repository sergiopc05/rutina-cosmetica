// Calcula los avisos de las próximas ~26 h para cada usuario con rutina activa y
// los inserta en notification_queue (idempotente por dedupe_key).
// Lo invoca pg_cron cada 15 minutos.
import { adminClient, corsHeaders, json } from '../_shared/supabaseAdmin.ts'
import { nextOccurrences } from '../_shared/schedule.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = adminClient()
  const now = new Date()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, timezone')
  if (error) return json({ ok: false, error: error.message }, 500)

  let queued = 0

  for (const profile of profiles ?? []) {
    const tz: string = profile.timezone || 'UTC'

    const { data: routines } = await supabase
      .from('routines')
      .select('id')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(1)
    const routine = routines?.[0]
    if (!routine) continue

    const [slotsRes, excRes, prodRes] = await Promise.all([
      supabase
        .from('routine_slots')
        .select('*')
        .eq('routine_id', routine.id)
        .is('deleted_at', null),
      supabase
        .from('routine_exceptions')
        .select('*')
        .eq('routine_id', routine.id)
        .is('deleted_at', null),
      supabase
        .from('products')
        .select('id, name')
        .eq('user_id', profile.id)
        .is('deleted_at', null),
    ])

    const nameById = new Map<string, string>(
      (prodRes.data ?? []).map((p) => [p.id, p.name]),
    )

    const occ = nextOccurrences({
      from: now,
      tz,
      horizonHours: 26,
      slots: slotsRes.data ?? [],
      exceptions: excRes.data ?? [],
    })
    if (occ.length === 0) continue

    const rows = occ.map((o) => {
      const label =
        o.step.title ||
        (o.step.productId ? nameById.get(o.step.productId) : '') ||
        'Paso de la rutina'
      const key = o.step.slotId
        ? `slot:${o.step.slotId}:${o.date}`
        : `exc:${o.step.exceptionId}:${o.date}`
      return {
        user_id: profile.id,
        routine_id: routine.id,
        slot_id: o.step.slotId,
        exception_id: o.step.exceptionId,
        for_date: o.date,
        scheduled_for: o.instant.toISOString(),
        dedupe_key: key,
        title: `${o.step.time} · ${label}`,
        body: o.step.instructions || 'Toca para ver tu rutina de ahora.',
        status: 'pending',
      }
    })

    const { error: upErr } = await supabase
      .from('notification_queue')
      .upsert(rows, {
        onConflict: 'user_id,dedupe_key',
        ignoreDuplicates: true,
      })
    if (upErr) return json({ ok: false, error: upErr.message }, 500)
    queued += rows.length
  }

  return json({ ok: true, considered: queued })
})
