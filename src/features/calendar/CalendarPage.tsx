import { useMemo, useState } from 'react'
import {
  useActiveRoutine,
  useExceptions,
  useSlots,
} from '@/db/queries'
import { EmptyState, PageHeader } from '@/components/ui'
import { isoWeekday, stepsForDate, todayISOInTz } from '@/lib/schedule'
import { classNames } from '@/lib/util'
import { useProfile } from '@/features/settings/profile'
import { DaySheet } from './DaySheet'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function CalendarPage() {
  const { timezone } = useProfile()
  const routine = useActiveRoutine()
  const slots = useSlots(routine?.id)
  const exceptions = useExceptions(routine?.id)

  const today = todayISOInTz(timezone)
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number)
    return { year: y, month: m - 1 }
  })
  const [selected, setSelected] = useState<string | null>(null)

  const grid = useMemo(() => {
    const first = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-01`
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const lead = isoWeekday(first) - 1 // celdas vacías antes del día 1
    const cells: (string | null)[] = []
    for (let i = 0; i < lead; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(
        `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      )
    }
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [cursor])

  function move(delta: number) {
    setCursor((c) => {
      const m = c.month + delta
      return {
        year: c.year + Math.floor(m / 12),
        month: ((m % 12) + 12) % 12,
      }
    })
  }

  if (!routine) {
    return (
      <div>
        <PageHeader title="Mes" />
        <EmptyState title="Sin rutina activa">
          Crea tu rutina para ver el calendario.
        </EmptyState>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Mes" subtitle="Toca un día para ajustarlo" />

      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => move(-1)} className="rounded-lg px-3 py-1 text-lg">
          ‹
        </button>
        <span className="font-semibold capitalize">
          {MONTHS[cursor.month]} {cursor.year}
        </span>
        <button onClick={() => move(1)} className="rounded-lg px-3 py-1 text-lg">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-black/40 dark:text-white/40">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((date, i) => {
          if (!date) return <div key={i} />
          const daySteps = stepsForDate({ date, slots, exceptions })
          const dayExc = exceptions.filter((e) => e.date === date)
          const isRest = daySteps.length === 0 && dayExc.length > 0
          const hasChange = dayExc.length > 0
          const isToday = date === today
          const dayNum = Number(date.slice(-2))
          return (
            <button
              key={date}
              onClick={() => setSelected(date)}
              className={classNames(
                'flex aspect-square flex-col items-center justify-center rounded-lg border text-sm',
                isToday
                  ? 'border-brand-500 bg-brand-50 font-bold dark:bg-brand-900/40'
                  : 'border-black/5 dark:border-white/10',
              )}
            >
              <span>{dayNum}</span>
              <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                {isRest ? (
                  <span className="text-[9px] leading-none text-black/40">💤</span>
                ) : (
                  daySteps.slice(0, 3).map((s, j) => (
                    <span
                      key={j}
                      className={classNames(
                        'h-1.5 w-1.5 rounded-full',
                        s.source === 'exception'
                          ? 'bg-amber-500'
                          : 'bg-brand-500',
                      )}
                    />
                  ))
                )}
              </span>
              {hasChange && !isRest && (
                <span className="absolute" />
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-black/45 dark:text-white/45">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-500 align-middle" />
        paso de la rutina
        <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" />
        cambio puntual
      </p>

      {selected && (
        <DaySheet date={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
