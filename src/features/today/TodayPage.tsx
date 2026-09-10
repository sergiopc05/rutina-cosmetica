import { Link } from 'react-router'
import { useDaySteps, type ResolvedStep } from '@/db/queries'
import { EmptyState, PageHeader } from '@/components/ui'
import { ProductThumb } from '@/components/ProductThumb'
import { classNames, formatLongDate, formatRelative } from '@/lib/util'
import { useAuth } from '@/app/AuthProvider'
import { toggleStepDone } from './completions'
import { useNextReminder, useToday } from './hooks'

export function TodayPage() {
  const { user } = useAuth()
  const { today, now } = useToday()
  const { routine, steps } = useDaySteps(today)
  const next = useNextReminder()

  const doneCount = steps.filter((s) => s.done).length

  return (
    <div>
      <PageHeader
        title="Hoy"
        subtitle={capitalize(formatLongDate(today))}
      />

      {next && (
        <div className="mb-4 rounded-2xl bg-brand-600 p-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">
            Próximo aviso
          </p>
          <p className="mt-0.5 text-lg font-bold">
            {next.step.time} · {next.step.title || 'Paso de la rutina'}
          </p>
          <p className="text-sm text-white/80">
            {next.date === today ? 'hoy' : formatLongDate(next.date)} ·{' '}
            {formatRelative(next.instant, now)}
          </p>
        </div>
      )}

      {!routine ? (
        <EmptyState title="Aún no tienes una rutina">
          <Link to="/rutina" className="text-brand-600 underline">
            Crea tu rutina semanal
          </Link>
        </EmptyState>
      ) : steps.length === 0 ? (
        <EmptyState title="Hoy no toca nada">
          Día de descanso según tu rutina.
        </EmptyState>
      ) : (
        <>
          <p className="mb-2 text-sm text-black/55 dark:text-white/55">
            {doneCount}/{steps.length} completados
          </p>
          <ul className="space-y-2">
            {steps.map((step) => (
              <StepRow
                key={step.key}
                step={step}
                onToggle={() =>
                  user && toggleStepDone(user.id, today, step)
                }
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function StepRow({
  step,
  onToggle,
}: {
  step: ResolvedStep
  onToggle: () => void
}) {
  return (
    <li>
      <div
        className={classNames(
          'flex items-center gap-3 rounded-2xl border p-3 transition-colors',
          step.done
            ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/40'
            : 'border-black/5 bg-white dark:border-white/10 dark:bg-white/5',
        )}
      >
        <div className="w-12 text-center">
          <span className="text-sm font-bold tabular-nums">{step.time}</span>
        </div>
        <ProductThumb product={step.product} />
        <div className="min-w-0 flex-1">
          <p
            className={classNames(
              'truncate font-semibold',
              step.done && 'line-through opacity-60',
            )}
          >
            {step.displayTitle}
          </p>
          {step.product?.brand && (
            <p className="truncate text-xs text-black/50 dark:text-white/50">
              {step.product.brand}
            </p>
          )}
          {step.instructions && (
            <p className="truncate text-xs text-black/55 dark:text-white/55">
              {step.instructions}
            </p>
          )}
          {step.source === 'exception' && (
            <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              Puntual
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          aria-label={step.done ? 'Marcar como pendiente' : 'Marcar como hecho'}
          className={classNames(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors',
            step.done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-black/20 text-transparent dark:border-white/25',
          )}
        >
          ✓
        </button>
      </div>
    </li>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
