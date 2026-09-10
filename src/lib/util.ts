import type { ISODate, Weekday } from './types'

export function uuid(): string {
  return crypto.randomUUID()
}

export function nowISO(): string {
  return new Date().toISOString()
}

/** Zona horaria IANA del dispositivo (p. ej. 'Europe/Madrid'). */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
}

export const WEEKDAY_LABELS_LONG: Record<Weekday, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

export const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7]

export function describeWeekdays(days: Weekday[]): string {
  const set = new Set(days)
  if (set.size === 7) return 'Todos los días'
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d as Weekday)))
    return 'Entre semana'
  if (set.size === 2 && set.has(6) && set.has(7)) return 'Fin de semana'
  return ALL_WEEKDAYS.filter((d) => set.has(d))
    .map((d) => WEEKDAY_LABELS[d])
    .join(', ')
}

export function formatTime(t: string): string {
  return t
}

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function formatLongDate(date: ISODate): string {
  const [y, m, d] = date.split('-').map(Number)
  return dateFmt.format(new Date(Date.UTC(y, m - 1, d)))
}

const relFmt = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })

/** "en 2 h", "en 15 min", "ahora". */
export function formatRelative(target: Date, from: Date = new Date()): string {
  const diffMs = target.getTime() - from.getTime()
  const min = Math.round(diffMs / 60000)
  if (Math.abs(min) < 1) return 'ahora'
  if (Math.abs(min) < 60) return relFmt.format(min, 'minute')
  const hours = Math.round(min / 60)
  if (Math.abs(hours) < 24) return relFmt.format(hours, 'hour')
  return relFmt.format(Math.round(hours / 24), 'day')
}

export function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(' ')
}
