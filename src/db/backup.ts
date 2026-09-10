import type { Syncable } from '@/lib/types'
import { db, SYNC_TABLES, type SyncTable } from './dexie'
import { putRow } from './mutations'

export interface BackupFile {
  app: 'rutina-cosmetica'
  version: 1
  exportedAt: string
  data: Record<SyncTable, Syncable[]>
}

export async function exportBackup(): Promise<BackupFile> {
  const data = {} as Record<SyncTable, Syncable[]>
  for (const table of SYNC_TABLES) {
    data[table] = (await db.table(table).toArray()) as Syncable[]
  }
  return {
    app: 'rutina-cosmetica',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
}

export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rutina-cosmetica-${backup.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Importa un backup fusionando por updated_at (last-write-wins). */
export async function importBackup(
  file: BackupFile,
  userId: string,
): Promise<number> {
  if (file.app !== 'rutina-cosmetica') throw new Error('Archivo no reconocido')
  const ts = (iso: string) => Date.parse(iso) || 0
  let count = 0
  for (const table of SYNC_TABLES) {
    for (const row of file.data[table] ?? []) {
      const local = (await db.table(table).get(row.id)) as Syncable | undefined
      if (!local || ts(row.updated_at) > ts(local.updated_at)) {
        await putRow(table, { ...row, user_id: userId })
        count++
      }
    }
  }
  return count
}
