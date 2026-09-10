import type { RealtimeChannel } from '@supabase/supabase-js'
import type { EntityTable } from 'dexie'
import type { Syncable } from '@/lib/types'
import { hasSupabase, supabase } from '@/lib/supabase'
import { nowISO } from '@/lib/util'
import { db, SYNC_TABLES, wipeLocalData } from './dexie'

type AnyTable = EntityTable<Syncable, 'id'>

const ts = (iso: string): number => {
  const n = Date.parse(iso)
  return Number.isNaN(n) ? 0 : n
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'disabled'

export interface SyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  pending: number
}

let state: SyncState = {
  status: hasSupabase ? 'idle' : 'disabled',
  lastSyncedAt: null,
  pending: 0,
}

const listeners = new Set<(s: SyncState) => void>()

export function getSyncState(): SyncState {
  return state
}

export function subscribeSync(cb: (s: SyncState) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function setState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch }
  for (const cb of listeners) cb(state)
}

let running = false
let rerun = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let channel: RealtimeChannel | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** Pide una sincronización (coalescida). */
export function requestSync(): void {
  void syncNow()
}

/** Sincronización con pequeño retardo, para eventos en ráfaga (realtime). */
function debouncedSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void syncNow(), 400)
}

export async function syncNow(): Promise<void> {
  if (!hasSupabase) return
  const userId = await currentUserId()
  if (!userId) return
  if (running) {
    rerun = true
    return
  }
  running = true
  setState({ status: 'syncing' })
  try {
    await pushOutbox(userId)
    await pullChanges(userId)
    setState({ status: 'idle', lastSyncedAt: nowISO() })
  } catch (err) {
    console.warn('[sync] error', err)
    setState({ status: navigator.onLine ? 'error' : 'offline' })
  } finally {
    running = false
    setState({ pending: await db.outbox.count() })
    if (rerun) {
      rerun = false
      void syncNow()
    }
  }
}

async function pushOutbox(userId: string): Promise<void> {
  const items = await db.outbox.orderBy('queuedAt').toArray()
  if (!items.length) return

  for (const table of SYNC_TABLES) {
    const forTable = items.filter((i) => i.table === table)
    if (!forTable.length) continue
    // Última versión encolada por fila.
    const byRow = new Map<string, (typeof forTable)[number]>()
    for (const it of forTable) byRow.set(it.rowId, it)
    const rows = [...byRow.values()].map((it) => ({
      ...it.payload,
      user_id: userId,
    }))
    const { error } = await supabase.from(table).upsert(rows, {
      onConflict: 'id',
    })
    if (error) throw error
    // Solo borra lo que hemos procesado (puede haber nuevas escrituras entretanto).
    await db.outbox.bulkDelete(forTable.map((it) => it.id))
  }
}

async function pullChanges(userId: string): Promise<void> {
  for (const table of SYNC_TABLES) {
    const cursorKey = `cursor:${table}`
    const cursor = (await db.meta.get(cursorKey))?.value as string | undefined

    let query = supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
      .limit(2000)
    if (cursor) query = query.gt('updated_at', cursor)

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) continue

    const localTable = db.table(table) as unknown as AnyTable
    await db.transaction('rw', db.table(table), db.meta, async () => {
      for (const remote of data as Syncable[]) {
        const local = await localTable.get(remote.id)
        // last-write-wins comparando instantes (los formatos ISO difieren
        // entre cliente 'Z' y Postgres '+00:00').
        if (!local || ts(remote.updated_at) >= ts(local.updated_at)) {
          await localTable.put(remote)
        }
      }
      await db.meta.put({
        key: cursorKey,
        value: (data[data.length - 1] as Syncable).updated_at,
      })
    })
  }
}

/**
 * Se llama al iniciar sesión. Si es un usuario distinto al que había en este
 * dispositivo, borra los datos locales antes de traer los suyos.
 */
export async function initSyncForUser(userId: string): Promise<void> {
  if (!hasSupabase) return
  const prev = (await db.meta.get('userId'))?.value as string | undefined
  if (prev && prev !== userId) {
    await wipeLocalData()
  }
  await db.meta.put({ key: 'userId', value: userId })

  await ensureBootstrap(userId)
  await syncNow()
  startRealtime(userId)
  startPolling()
}

export function teardownSync(): void {
  stopRealtime()
  stopPolling()
}

async function ensureBootstrap(userId: string): Promise<void> {
  // Perfil (fuera del sync local; se gestiona directo en Supabase).
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (!profile) {
    await supabase.from('profiles').insert({
      id: userId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
  }
}

function startRealtime(userId: string): void {
  stopRealtime()
  const ch = supabase.channel(`sync:${userId}`)
  for (const table of SYNC_TABLES) {
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      () => debouncedSync(),
    )
  }
  ch.subscribe()
  channel = ch
}

function stopRealtime(): void {
  if (channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
}

function startPolling(): void {
  stopPolling()
  pollTimer = setInterval(() => void syncNow(), 60_000)
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
}

function stopPolling(): void {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  window.removeEventListener('online', onOnline)
  document.removeEventListener('visibilitychange', onVisible)
}

function onOnline(): void {
  void syncNow()
}
function onVisible(): void {
  if (document.visibilityState === 'visible') void syncNow()
}
