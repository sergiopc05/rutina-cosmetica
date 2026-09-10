import { db } from '@/db/dexie'
import { newRow, putRow } from '@/db/mutations'
import type { Routine } from '@/lib/types'

export async function createRoutine(
  userId: string,
  name = 'Mi rutina',
): Promise<Routine> {
  const others = (await db.routines.toArray()).filter((r) => !r.deleted_at)
  const row = newRow<Routine>(userId, {
    name,
    is_active: others.length === 0,
  })
  return putRow('routines', row)
}

export async function setActiveRoutine(
  routines: Routine[],
  id: string,
): Promise<void> {
  for (const r of routines) {
    const shouldBeActive = r.id === id
    if (r.is_active !== shouldBeActive) {
      await putRow('routines', { ...r, is_active: shouldBeActive })
    }
  }
}

export async function renameRoutine(routine: Routine, name: string): Promise<void> {
  await putRow('routines', { ...routine, name })
}
