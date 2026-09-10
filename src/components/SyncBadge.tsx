import { useSyncExternalStore } from 'react'
import { getSyncState, subscribeSync } from '@/db/sync'
import { classNames } from '@/lib/util'

export function useSync() {
  return useSyncExternalStore(subscribeSync, getSyncState, getSyncState)
}

export function SyncBadge() {
  const s = useSync()
  const map = {
    idle: { text: 'Sincronizado', dot: 'bg-emerald-500' },
    syncing: { text: 'Sincronizando…', dot: 'bg-brand-500 animate-pulse' },
    offline: { text: 'Sin conexión', dot: 'bg-amber-500' },
    error: { text: 'Error de sync', dot: 'bg-red-500' },
    disabled: { text: 'Solo local', dot: 'bg-neutral-400' },
  }[s.status]

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-black/50 dark:text-white/50">
      <span className={classNames('h-2 w-2 rounded-full', map.dot)} />
      {map.text}
      {s.pending > 0 && s.status !== 'syncing' && ` · ${s.pending} sin subir`}
    </span>
  )
}
