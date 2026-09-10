// Lógica de programación. SIN dependencias (solo Intl + Date) para poder copiarla
// tal cual a las Edge Functions de Supabase (Deno).
//
// ⚠️ Si cambias este archivo, replica el cambio en
//    supabase/functions/_shared/schedule.ts

import type {
  DayStep,
  ISODate,
  RoutineException,
  RoutineSlot,
  Weekday,
} from './types'

/** ISO-8601: 1 = lunes ... 7 = domingo, a partir de una fecha 'YYYY-MM-DD'. */
export function isoWeekday(date: ISODate): Weekday {
  const [y, m, d] = date.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = domingo
  return (dow === 0 ? 7 : dow) as Weekday
}

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
export function addDaysISO(date: ISODate, n: number): ISODate {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

/** La fecha de "hoy" en una zona horaria IANA. */
export function todayISOInTz(tz: string, now: Date = new Date()): ISODate {
  // 'en-CA' formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function tzOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const p: Record<string, string> = {}
  for (const part of parts) p[part.type] = part.value
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  )
  return asUTC - instant.getTime()
}

/**
 * Convierte una hora "de pared" (año/mes/día/hora/minuto en una zona) al instante
 * UTC correspondiente, gestionando los cambios de horario de verano.
 */
export function zonedWallTimeToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz: string,
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0)
  const off1 = tzOffsetMs(new Date(guess), tz)
  let ts = guess - off1
  const off2 = tzOffsetMs(new Date(ts), tz)
  if (off2 !== off1) ts = guess - off2
  return new Date(ts)
}

export function stepKey(
  date: ISODate,
  slotId: string | null,
  exceptionId: string | null,
): string {
  return `${date}|${slotId ?? '-'}|${exceptionId ?? '-'}`
}

export interface StepsInput {
  date: ISODate
  /** Slots de la rutina activa, ya sin borrados. */
  slots: RoutineSlot[]
  /** Excepciones de la rutina activa, ya sin borrados. */
  exceptions: RoutineException[]
}

/** Pasos de un día concreto, aplicadas las excepciones, ordenados por hora. */
export function stepsForDate({ date, slots, exceptions }: StepsInput): DayStep[] {
  const wd = isoWeekday(date)
  const dayExceptions = exceptions.filter((e) => e.date === date)

  let steps: DayStep[] = slots
    .filter((s) => s.weekdays.includes(wd))
    .map((s) => ({
      key: stepKey(date, s.id, null),
      source: 'slot' as const,
      slotId: s.id,
      exceptionId: null,
      time: s.time_local,
      productId: s.product_id,
      title: s.title ?? '',
      instructions: s.instructions,
      order: s.step_order,
    }))

  // 'skip' sin slot => día de descanso completo.
  if (dayExceptions.some((e) => e.kind === 'skip' && !e.slot_id)) {
    steps = []
  }

  for (const e of dayExceptions) {
    if (e.kind === 'skip' && e.slot_id) {
      steps = steps.filter((s) => s.slotId !== e.slot_id)
    } else if (e.kind === 'replace' && e.slot_id) {
      steps = steps.map((s) =>
        s.slotId === e.slot_id
          ? {
              ...s,
              time: e.time_local ?? s.time,
              productId: e.product_id ?? s.productId,
              title: e.product_id ? (e.title ?? '') : (e.title ?? s.title),
              instructions: e.instructions ?? s.instructions,
            }
          : s,
      )
    } else if (e.kind === 'add') {
      steps.push({
        key: stepKey(date, null, e.id),
        source: 'exception',
        slotId: null,
        exceptionId: e.id,
        time: e.time_local ?? '09:00',
        productId: e.product_id,
        title: e.title ?? '',
        instructions: e.instructions,
        order: 9999,
      })
    }
  }

  return steps.sort(
    (a, b) => a.time.localeCompare(b.time) || a.order - b.order,
  )
}

export interface Occurrence {
  instant: Date
  date: ISODate
  step: DayStep
}

/** Instantes UTC de los próximos avisos dentro de un horizonte en horas. */
export function nextOccurrences(params: {
  from: Date
  tz: string
  horizonHours: number
  slots: RoutineSlot[]
  exceptions: RoutineException[]
}): Occurrence[] {
  const { from, tz, horizonHours, slots, exceptions } = params
  const until = new Date(from.getTime() + horizonHours * 3_600_000)
  const startDate = todayISOInTz(tz, from)
  const out: Occurrence[] = []
  const maxDays = Math.ceil(horizonHours / 24) + 2

  for (let i = 0; i < maxDays; i++) {
    const date = addDaysISO(startDate, i)
    for (const step of stepsForDate({ date, slots, exceptions })) {
      const [h, m] = step.time.split(':').map(Number)
      const [y, mo, d] = date.split('-').map(Number)
      const instant = zonedWallTimeToUtc(y, mo, d, h, m, tz)
      if (instant.getTime() > from.getTime() && instant <= until) {
        out.push({ instant, date, step })
      }
    }
  }
  return out.sort((a, b) => a.instant.getTime() - b.instant.getTime())
}
