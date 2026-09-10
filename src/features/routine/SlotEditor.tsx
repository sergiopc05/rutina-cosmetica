import { useState, type FormEvent } from 'react'
import type { Routine, RoutineSlot, Weekday } from '@/lib/types'
import { useProducts } from '@/db/queries'
import { newRow, putRow, softDeleteRow } from '@/db/mutations'
import { Button, Field, Select, TextArea, TextInput } from '@/components/ui'
import { WeekdayPicker } from '@/components/WeekdayPicker'
import { useAuth } from '@/app/AuthProvider'

export function SlotEditor({
  routine,
  slot,
  onDone,
}: {
  routine: Routine
  slot?: RoutineSlot
  onDone: () => void
}) {
  const { user } = useAuth()
  const products = useProducts()

  const [productId, setProductId] = useState<string>(slot?.product_id ?? '')
  const [title, setTitle] = useState(slot?.title ?? '')
  const [time, setTime] = useState(slot?.time_local ?? '08:00')
  const [weekdays, setWeekdays] = useState<Weekday[]>(
    slot?.weekdays ?? [1, 2, 3, 4, 5, 6, 7],
  )
  const [order, setOrder] = useState(slot?.step_order ?? 0)
  const [instructions, setInstructions] = useState(slot?.instructions ?? '')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || weekdays.length === 0) return
    const fields = {
      routine_id: routine.id,
      product_id: productId || null,
      title: productId ? null : title.trim() || 'Paso',
      time_local: time,
      weekdays,
      step_order: order,
      instructions: instructions.trim() || null,
    }
    const row: RoutineSlot =
      slot != null ? { ...slot, ...fields } : newRow<RoutineSlot>(user.id, fields)
    await putRow('routine_slots', row)
    onDone()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Producto">
        <Select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">— Sin producto (título libre) —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.brand ? ` · ${p.brand}` : ''}
            </option>
          ))}
        </Select>
      </Field>

      {!productId && (
        <Field label="Título del paso">
          <TextInput
            required
            placeholder="p. ej. Limpiador, Protector solar…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
      )}

      <div className="flex gap-3">
        <Field label="Hora">
          <TextInput
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </Field>
        <Field label="Orden" hint="Si coinciden en hora">
          <TextInput
            type="number"
            min={0}
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="Días">
        <WeekdayPicker value={weekdays} onChange={setWeekdays} />
      </Field>

      <Field label="Instrucciones" hint="Opcional">
        <TextArea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="p. ej. capa fina, evitar contorno de ojos"
        />
      </Field>

      <div className="flex gap-2 pt-1">
        {slot && (
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              await softDeleteRow('routine_slots', slot)
              onDone()
            }}
          >
            Eliminar
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onDone} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={weekdays.length === 0}>
          Guardar
        </Button>
      </div>
    </form>
  )
}
