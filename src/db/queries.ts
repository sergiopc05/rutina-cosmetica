import { useLiveQuery } from 'dexie-react-hooks'
import { stepsForDate } from '@/lib/schedule'
import type {
  DayStep,
  ISODate,
  Product,
  Routine,
  RoutineException,
  RoutineSlot,
  StepCompletion,
} from '@/lib/types'
import { db } from './dexie'

const alive = <T extends { deleted_at: string | null }>(xs: T[]): T[] =>
  xs.filter((x) => !x.deleted_at)

export function useProducts(): Product[] {
  return (
    useLiveQuery(async () => alive(await db.products.toArray()), [], [] as Product[]).sort(
      (a, b) => a.name.localeCompare(b.name, 'es'),
    ) ?? []
  )
}

export function useProduct(id: string | undefined): Product | undefined {
  return useLiveQuery(
    async () => (id ? await db.products.get(id) : undefined),
    [id],
  )
}

export function useRoutines(): Routine[] {
  return (
    useLiveQuery(async () => alive(await db.routines.toArray()), [], [] as Routine[]) ?? []
  )
}

export function useActiveRoutine(): Routine | undefined {
  return useLiveQuery(async () => {
    const routines = alive(await db.routines.toArray())
    return routines.find((r) => r.is_active) ?? routines[0]
  }, [])
}

export function useSlots(routineId: string | undefined): RoutineSlot[] {
  return (
    useLiveQuery(
      async () => {
        if (!routineId) return []
        return alive(
          await db.routine_slots.where('routine_id').equals(routineId).toArray(),
        ).sort(
          (a, b) =>
            a.time_local.localeCompare(b.time_local) || a.step_order - b.step_order,
        )
      },
      [routineId],
      [] as RoutineSlot[],
    ) ?? []
  )
}

export function useExceptions(routineId: string | undefined): RoutineException[] {
  return (
    useLiveQuery(
      async () => {
        if (!routineId) return []
        return alive(
          await db.routine_exceptions
            .where('routine_id')
            .equals(routineId)
            .toArray(),
        )
      },
      [routineId],
      [] as RoutineException[],
    ) ?? []
  )
}

export interface ProductUsage {
  slots: RoutineSlot[]
  exceptions: RoutineException[]
}

export function useProductUsage(productId: string | undefined): ProductUsage {
  return (
    useLiveQuery(
      async () => {
        if (!productId) return { slots: [], exceptions: [] }
        const slots = alive(await db.routine_slots.toArray()).filter(
          (s) => s.product_id === productId,
        )
        const exceptions = alive(await db.routine_exceptions.toArray()).filter(
          (e) => e.product_id === productId,
        )
        return { slots, exceptions }
      },
      [productId],
      { slots: [], exceptions: [] } as ProductUsage,
    ) ?? { slots: [], exceptions: [] }
  )
}

export function useCompletions(date: ISODate): StepCompletion[] {
  return (
    useLiveQuery(
      async () =>
        alive(await db.step_completions.where('date').equals(date).toArray()),
      [date],
      [] as StepCompletion[],
    ) ?? []
  )
}

export interface ResolvedStep extends DayStep {
  product: Product | undefined
  displayTitle: string
  done: boolean
  completion: StepCompletion | undefined
}

/** Pasos de un día resueltos: producto, título mostrado y estado "hecho". */
export function useDaySteps(date: ISODate): {
  routine: Routine | undefined
  steps: ResolvedStep[]
} {
  const routine = useActiveRoutine()
  const slots = useSlots(routine?.id)
  const exceptions = useExceptions(routine?.id)
  const products = useProducts()
  const completions = useCompletions(date)

  const byId = new Map(products.map((p) => [p.id, p]))
  const raw = stepsForDate({ date, slots, exceptions })

  const steps: ResolvedStep[] = raw.map((s) => {
    const product = s.productId ? byId.get(s.productId) : undefined
    const completion = completions.find((c) =>
      s.source === 'slot' ? c.slot_id === s.slotId : c.exception_id === s.exceptionId,
    )
    return {
      ...s,
      product,
      displayTitle: s.title || product?.name || 'Paso sin producto',
      done: Boolean(completion),
      completion,
    }
  })

  return { routine, steps }
}
