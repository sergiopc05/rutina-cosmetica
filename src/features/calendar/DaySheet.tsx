import { useState } from 'react'
import type { ISODate, RoutineSlot } from '@/lib/types'
import {
  useActiveRoutine,
  useDaySteps,
  useExceptions,
  useSlots,
} from '@/db/queries'
import { Button, Modal } from '@/components/ui'
import { ProductThumb } from '@/components/ProductThumb'
import { formatLongDate } from '@/lib/util'
import { useAuth } from '@/app/AuthProvider'
import { ExceptionEditor } from './ExceptionEditor'
import { removeException, skipStepToday, toggleRestDay } from './exceptions'

export function DaySheet({
  date,
  onClose,
}: {
  date: ISODate
  onClose: () => void
}) {
  const { user } = useAuth()
  const routine = useActiveRoutine()
  const slots = useSlots(routine?.id)
  const allExceptions = useExceptions(routine?.id)
  const { steps } = useDaySteps(date)
  const dayExceptions = allExceptions.filter((e) => e.date === date)
  const restException = dayExceptions.find(
    (e) => e.kind === 'skip' && !e.slot_id,
  )

  const [sub, setSub] = useState<
    | { kind: 'add' }
    | { kind: 'replace'; slot: RoutineSlot }
    | null
  >(null)

  const slotById = new Map(slots.map((s) => [s.id, s]))

  return (
    <Modal open onClose={onClose} title={capitalize(formatLongDate(date))}>
      {!routine ? (
        <p className="text-sm text-black/55">Crea antes una rutina.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <Button
              variant={restException ? 'danger' : 'secondary'}
              className="w-full"
              onClick={() =>
                user &&
                toggleRestDay(user.id, routine.id, date, restException)
              }
            >
              {restException ? 'Quitar día de descanso' : 'Marcar día de descanso'}
            </Button>
          </div>

          {steps.length === 0 ? (
            <p className="text-sm text-black/55 dark:text-white/55">
              Sin pasos este día.
            </p>
          ) : (
            <ul className="space-y-2">
              {steps.map((step) => {
                const slot = step.slotId ? slotById.get(step.slotId) : undefined
                return (
                  <li
                    key={step.key}
                    className="rounded-xl border border-black/5 p-2.5 dark:border-white/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-11 text-center text-sm font-bold tabular-nums">
                        {step.time}
                      </span>
                      <ProductThumb product={step.product} size={36} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {step.displayTitle}
                      </span>
                    </div>
                    {step.source === 'slot' && slot && (
                      <div className="mt-2 flex gap-2 pl-[54px]">
                        <button
                          className="text-xs font-medium text-brand-600"
                          onClick={() =>
                            user &&
                            skipStepToday(user.id, routine.id, date, slot.id)
                          }
                        >
                          Saltar hoy
                        </button>
                        <button
                          className="text-xs font-medium text-brand-600"
                          onClick={() => setSub({ kind: 'replace', slot })}
                        >
                          Editar solo hoy
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setSub({ kind: 'add' })}
          >
            + Añadir paso puntual
          </Button>

          {dayExceptions.length > 0 && (
            <div className="border-t border-black/5 pt-3 dark:border-white/10">
              <p className="mb-1.5 text-xs font-semibold text-black/50 dark:text-white/50">
                Cambios de este día
              </p>
              <ul className="space-y-1">
                {dayExceptions.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between text-xs text-black/60 dark:text-white/60"
                  >
                    <span>
                      {e.kind === 'skip' && !e.slot_id && 'Día de descanso'}
                      {e.kind === 'skip' && e.slot_id && 'Paso saltado'}
                      {e.kind === 'add' &&
                        `Añadido: ${e.title ?? 'producto'} (${e.time_local})`}
                      {e.kind === 'replace' &&
                        `Modificado: ${e.time_local ?? ''}`}
                    </span>
                    <button
                      className="text-brand-600"
                      onClick={() => removeException(e)}
                    >
                      deshacer
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {sub && routine && (
        <Modal
          open
          onClose={() => setSub(null)}
          title={sub.kind === 'add' ? 'Paso puntual' : 'Cambiar solo hoy'}
        >
          <ExceptionEditor
            routine={routine}
            date={date}
            kind={sub.kind}
            targetSlot={sub.kind === 'replace' ? sub.slot : undefined}
            onDone={() => setSub(null)}
          />
        </Modal>
      )}
    </Modal>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
