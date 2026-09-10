import { useState, type FormEvent } from 'react'
import type {
  ISODate,
  Routine,
  RoutineException,
  RoutineSlot,
} from '@/lib/types'
import { useProducts } from '@/db/queries'
import { newRow, putRow } from '@/db/mutations'
import { Button, Field, Select, TextArea, TextInput } from '@/components/ui'
import { useAuth } from '@/app/AuthProvider'

/**
 * Editor de excepción para 'add' (paso puntual) y 'replace' (cambiar un paso
 * concreto solo ese día).
 */
export function ExceptionEditor({
  routine,
  date,
  kind,
  targetSlot,
  onDone,
}: {
  routine: Routine
  date: ISODate
  kind: 'add' | 'replace'
  targetSlot?: RoutineSlot
  onDone: () => void
}) {
  const { user } = useAuth()
  const products = useProducts()

  const [productId, setProductId] = useState(targetSlot?.product_id ?? '')
  const [title, setTitle] = useState(targetSlot?.title ?? '')
  const [time, setTime] = useState(targetSlot?.time_local ?? '20:00')
  const [instructions, setInstructions] = useState(
    targetSlot?.instructions ?? '',
  )

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    await putRow(
      'routine_exceptions',
      newRow<RoutineException>(user.id, {
        routine_id: routine.id,
        date,
        kind,
        slot_id: kind === 'replace' ? (targetSlot?.id ?? null) : null,
        product_id: productId || null,
        title: productId ? null : title.trim() || null,
        time_local: time,
        instructions: instructions.trim() || null,
      }),
    )
    onDone()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Producto">
        <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">— Sin producto —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.brand ? ` · ${p.brand}` : ''}
            </option>
          ))}
        </Select>
      </Field>

      {!productId && (
        <Field label="Título">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p. ej. Mascarilla"
          />
        </Field>
      )}

      <Field label="Hora">
        <TextInput
          type="time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </Field>

      <Field label="Instrucciones" hint="Opcional">
        <TextArea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          {kind === 'add' ? 'Añadir a este día' : 'Cambiar solo este día'}
        </Button>
      </div>
    </form>
  )
}
