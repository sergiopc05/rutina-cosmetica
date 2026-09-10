// Tipos de dominio compartidos por la UI, el motor de sincronización y (copiados)
// por las Edge Functions de Supabase.

export type ISODate = string // 'YYYY-MM-DD'
export type LocalTime = string // 'HH:MM' en 24h
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7 // ISO-8601: 1 = lunes ... 7 = domingo

export interface Syncable {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Profile {
  id: string
  display_name: string | null
  timezone: string
  app_name: string | null
  created_at: string
  updated_at: string
}

export interface Product extends Syncable {
  name: string
  brand: string | null
  barcode: string | null
  /** Ruta dentro del bucket de Storage con la foto subida por el usuario. */
  photo_path: string | null
  /** URL de la foto oficial de Open Beauty Facts. */
  off_image_url: string | null
  /** Respuesta cacheada de Open Beauty Facts. */
  off_data: unknown | null
  ingredients_text: string | null
  notes: string | null
}

export interface Routine extends Syncable {
  name: string
  is_active: boolean
}

export interface RoutineSlot extends Syncable {
  routine_id: string
  product_id: string | null
  /** Título alternativo cuando el paso no está ligado a un producto. */
  title: string | null
  time_local: LocalTime
  weekdays: Weekday[]
  step_order: number
  instructions: string | null
}

export type ExceptionKind = 'skip' | 'add' | 'replace'

export interface RoutineException extends Syncable {
  routine_id: string
  date: ISODate
  kind: ExceptionKind
  /** Paso afectado (para 'skip' y 'replace'). null en 'skip' = descansar todo el día. */
  slot_id: string | null
  /** Producto (para 'add' y 'replace'). */
  product_id: string | null
  title: string | null
  time_local: LocalTime | null
  instructions: string | null
}

export interface StepCompletion extends Syncable {
  date: ISODate
  slot_id: string | null
  exception_id: string | null
  completed_at: string
}

export interface PushSubscriptionRow extends Syncable {
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  platform: string | null
}

/** Paso concreto de un día, ya resueltas las excepciones. */
export interface DayStep {
  /** Clave estable: sirve como key de React y para deduplicar el "hecho". */
  key: string
  source: 'slot' | 'exception'
  slotId: string | null
  exceptionId: string | null
  time: LocalTime
  productId: string | null
  /** Título literal del slot/excepción; vacío si hay que resolverlo por producto. */
  title: string
  instructions: string | null
  order: number
}
