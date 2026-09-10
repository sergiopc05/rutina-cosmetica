import type { EntityTable } from 'dexie'
import type { Syncable } from '@/lib/types'
import { nowISO, uuid } from '@/lib/util'
import { db, type SyncTable } from './dexie'
import { requestSync } from './sync'

type AnyTable = EntityTable<Syncable, 'id'>

/**
 * Escribe (crea o actualiza) una fila en el almacén local y la encola para
 * sincronizar. Toda la UI pasa por aquí; nunca escribe en Supabase directamente.
 */
export async function putRow<T extends Syncable>(
  table: SyncTable,
  row: T,
): Promise<T> {
  const next = { ...row, updated_at: nowISO() }
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    await (db.table(table) as unknown as AnyTable).put(next)
    await db.outbox.where('[table+rowId]').equals([table, next.id]).delete()
    await db.outbox.put({
      id: uuid(),
      table,
      rowId: next.id,
      payload: next as unknown as Record<string, unknown>,
      queuedAt: nowISO(),
    })
  })
  requestSync()
  return next
}

/** Borrado lógico: marca deleted_at y sincroniza. */
export async function softDeleteRow<T extends Syncable>(
  table: SyncTable,
  row: T,
): Promise<void> {
  await putRow(table, { ...row, deleted_at: nowISO() })
}

/** Crea el esqueleto de una fila nueva con los campos de Syncable ya puestos. */
export function newRow<T extends Syncable>(
  userId: string,
  extra: Omit<T, keyof Syncable>,
): T {
  const ts = nowISO()
  return {
    id: uuid(),
    user_id: userId,
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
    ...extra,
  } as T
}
