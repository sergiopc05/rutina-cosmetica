import { useState } from 'react'
import {
  useActiveRoutine,
  useProducts,
  useRoutines,
  useSlots,
} from '@/db/queries'
import type { RoutineSlot } from '@/lib/types'
import { Button, EmptyState, Modal, PageHeader, Select } from '@/components/ui'
import { ProductThumb } from '@/components/ProductThumb'
import { describeWeekdays } from '@/lib/util'
import { useAuth } from '@/app/AuthProvider'
import { createRoutine, renameRoutine, setActiveRoutine } from './actions'
import { SlotEditor } from './SlotEditor'

export function RoutinePage() {
  const { user } = useAuth()
  const routines = useRoutines()
  const routine = useActiveRoutine()
  const slots = useSlots(routine?.id)
  const products = useProducts()
  const byId = new Map(products.map((p) => [p.id, p]))

  const [editingSlot, setEditingSlot] = useState<RoutineSlot | null>(null)
  const [adding, setAdding] = useState(false)

  if (!routine) {
    return (
      <div>
        <PageHeader title="Rutina" />
        <EmptyState title="Aún no tienes una rutina">
          <Button
            className="mt-2"
            onClick={() => user && createRoutine(user.id)}
          >
            Crear rutina
          </Button>
        </EmptyState>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Rutina semanal"
        action={<Button onClick={() => setAdding(true)}>+ Paso</Button>}
      />

      <div className="mb-4 flex items-center gap-2">
        {routines.length > 1 ? (
          <Select
            value={routine.id}
            onChange={(e) => setActiveRoutine(routines, e.target.value)}
            className="flex-1"
          >
            {routines.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        ) : (
          <input
            className="flex-1 rounded-xl border border-transparent bg-transparent px-1 py-1 text-lg font-semibold outline-none focus:border-black/10 focus:bg-white dark:focus:bg-white/5"
            value={routine.name}
            onChange={(e) => renameRoutine(routine, e.target.value)}
          />
        )}
        <button
          className="rounded-lg px-2 py-1 text-xs text-brand-600"
          onClick={() => user && createRoutine(user.id, 'Otra rutina')}
        >
          + rutina
        </button>
      </div>

      {slots.length === 0 ? (
        <EmptyState title="Rutina vacía">
          Añade el primer paso con el botón “+ Paso”.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {slots.map((slot) => (
            <li key={slot.id}>
              <button
                onClick={() => setEditingSlot(slot)}
                className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-left dark:border-white/10 dark:bg-white/5"
              >
                <div className="w-12 text-center text-sm font-bold tabular-nums">
                  {slot.time_local}
                </div>
                <ProductThumb
                  product={slot.product_id ? byId.get(slot.product_id) : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {slot.product_id
                      ? (byId.get(slot.product_id)?.name ?? 'Producto eliminado')
                      : (slot.title ?? 'Paso')}
                  </p>
                  <p className="truncate text-xs text-black/50 dark:text-white/50">
                    {describeWeekdays(slot.weekdays)}
                  </p>
                </div>
                <span className="text-black/30 dark:text-white/30">✎</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={adding || editingSlot != null}
        onClose={() => {
          setAdding(false)
          setEditingSlot(null)
        }}
        title={editingSlot ? 'Editar paso' : 'Nuevo paso'}
      >
        <SlotEditor
          routine={routine}
          slot={editingSlot ?? undefined}
          onDone={() => {
            setAdding(false)
            setEditingSlot(null)
          }}
        />
      </Modal>
    </div>
  )
}
