import { newRow, putRow, softDeleteRow } from '@/db/mutations'
import type { ISODate, RoutineException } from '@/lib/types'

export async function toggleRestDay(
  userId: string,
  routineId: string,
  date: ISODate,
  existing: RoutineException | undefined,
): Promise<void> {
  if (existing) {
    await softDeleteRow('routine_exceptions', existing)
    return
  }
  await putRow(
    'routine_exceptions',
    newRow<RoutineException>(userId, {
      routine_id: routineId,
      date,
      kind: 'skip',
      slot_id: null,
      product_id: null,
      title: null,
      time_local: null,
      instructions: null,
    }),
  )
}

export async function skipStepToday(
  userId: string,
  routineId: string,
  date: ISODate,
  slotId: string,
): Promise<void> {
  await putRow(
    'routine_exceptions',
    newRow<RoutineException>(userId, {
      routine_id: routineId,
      date,
      kind: 'skip',
      slot_id: slotId,
      product_id: null,
      title: null,
      time_local: null,
      instructions: null,
    }),
  )
}

export async function removeException(exc: RoutineException): Promise<void> {
  await softDeleteRow('routine_exceptions', exc)
}
