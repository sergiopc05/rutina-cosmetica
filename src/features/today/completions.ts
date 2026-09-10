import { db } from '@/db/dexie'
import { newRow, putRow, softDeleteRow } from '@/db/mutations'
import type { ResolvedStep } from '@/db/queries'
import type { ISODate, StepCompletion } from '@/lib/types'
import { nowISO } from '@/lib/util'

export async function toggleStepDone(
  userId: string,
  date: ISODate,
  step: ResolvedStep,
): Promise<void> {
  if (step.completion) {
    await softDeleteRow('step_completions', step.completion)
    return
  }

  // ¿Hay una marca borrada para el mismo paso/fecha? La revivimos.
  const all = await db.step_completions.where('date').equals(date).toArray()
  const existing = all.find((c) =>
    step.slotId ? c.slot_id === step.slotId : c.exception_id === step.exceptionId,
  )
  if (existing) {
    await putRow('step_completions', {
      ...existing,
      deleted_at: null,
      completed_at: nowISO(),
    })
    return
  }

  await putRow(
    'step_completions',
    newRow<StepCompletion>(userId, {
      date,
      slot_id: step.slotId,
      exception_id: step.exceptionId,
      completed_at: nowISO(),
    }),
  )
}
