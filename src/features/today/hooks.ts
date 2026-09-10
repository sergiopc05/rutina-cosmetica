import { useEffect, useMemo, useState } from 'react'
import {
  useActiveRoutine,
  useExceptions,
  useSlots,
} from '@/db/queries'
import { nextOccurrences, todayISOInTz, type Occurrence } from '@/lib/schedule'
import type { ISODate } from '@/lib/types'
import { useProfile } from '@/features/settings/profile'

/** Se actualiza cada 30 s para refrescar cuentas atrás y el día actual. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function useToday(): { today: ISODate; timezone: string; now: Date } {
  const { timezone } = useProfile()
  const now = useNow()
  return { today: todayISOInTz(timezone, now), timezone, now }
}

export function useNextReminder(): Occurrence | null {
  const { timezone } = useProfile()
  const now = useNow()
  const routine = useActiveRoutine()
  const slots = useSlots(routine?.id)
  const exceptions = useExceptions(routine?.id)

  return useMemo(() => {
    if (!routine) return null
    const occ = nextOccurrences({
      from: now,
      tz: timezone,
      horizonHours: 24 * 7,
      slots,
      exceptions,
    })
    return occ[0] ?? null
  }, [routine, now, timezone, slots, exceptions])
}
