import Dexie, { type EntityTable } from 'dexie'
import type {
  Product,
  Routine,
  RoutineException,
  RoutineSlot,
  StepCompletion,
} from '@/lib/types'

export type SyncTable =
  | 'products'
  | 'routines'
  | 'routine_slots'
  | 'routine_exceptions'
  | 'step_completions'

export const SYNC_TABLES: SyncTable[] = [
  'products',
  'routines',
  'routine_slots',
  'routine_exceptions',
  'step_completions',
]

export interface OutboxItem {
  id: string
  table: SyncTable
  rowId: string
  payload: Record<string, unknown>
  queuedAt: string
}

export interface MetaRow {
  key: string
  value: unknown
}

const db = new Dexie('rutina-cosmetica') as Dexie & {
  products: EntityTable<Product, 'id'>
  routines: EntityTable<Routine, 'id'>
  routine_slots: EntityTable<RoutineSlot, 'id'>
  routine_exceptions: EntityTable<RoutineException, 'id'>
  step_completions: EntityTable<StepCompletion, 'id'>
  outbox: EntityTable<OutboxItem, 'id'>
  meta: EntityTable<MetaRow, 'key'>
}

db.version(1).stores({
  products: 'id, updated_at, barcode',
  routines: 'id, updated_at, is_active',
  routine_slots: 'id, routine_id, updated_at',
  routine_exceptions: 'id, routine_id, date, updated_at',
  step_completions: 'id, date, updated_at',
  outbox: 'id, table, [table+rowId], queuedAt',
  meta: 'key',
})

export { db }

export async function wipeLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.products,
      db.routines,
      db.routine_slots,
      db.routine_exceptions,
      db.step_completions,
      db.outbox,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.products.clear(),
        db.routines.clear(),
        db.routine_slots.clear(),
        db.routine_exceptions.clear(),
        db.step_completions.clear(),
        db.outbox.clear(),
        db.meta.clear(),
      ])
    },
  )
}
