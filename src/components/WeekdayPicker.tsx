import type { Weekday } from '@/lib/types'
import { ALL_WEEKDAYS, classNames, WEEKDAY_LABELS } from '@/lib/util'

const PRESETS: { label: string; days: Weekday[] }[] = [
  { label: 'Todos', days: [1, 2, 3, 4, 5, 6, 7] },
  { label: 'Entre semana', days: [1, 2, 3, 4, 5] },
  { label: 'Fin de semana', days: [6, 7] },
]

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: Weekday[]
  onChange: (v: Weekday[]) => void
}) {
  const set = new Set(value)
  function toggle(d: Weekday) {
    const next = new Set(set)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    onChange(ALL_WEEKDAYS.filter((x) => next.has(x)))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {ALL_WEEKDAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={classNames(
              'flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
              set.has(d)
                ? 'bg-brand-600 text-white'
                : 'bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50',
            )}
          >
            {WEEKDAY_LABELS[d].slice(0, 1)}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.days)}
            className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
