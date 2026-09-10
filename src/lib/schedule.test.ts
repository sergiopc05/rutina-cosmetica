import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  isoWeekday,
  nextOccurrences,
  stepsForDate,
  zonedWallTimeToUtc,
} from './schedule'
import type { RoutineException, RoutineSlot, Weekday } from './types'

const base = {
  user_id: 'u1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
}

function slot(over: Partial<RoutineSlot> & { id: string }): RoutineSlot {
  return {
    ...base,
    routine_id: 'r1',
    product_id: null,
    title: over.id,
    time_local: '08:00',
    weekdays: [1, 2, 3, 4, 5, 6, 7] as Weekday[],
    step_order: 0,
    instructions: null,
    ...over,
  }
}

function exception(
  over: Partial<RoutineException> & { id: string; date: string; kind: RoutineException['kind'] },
): RoutineException {
  return {
    ...base,
    routine_id: 'r1',
    slot_id: null,
    product_id: null,
    title: null,
    time_local: null,
    instructions: null,
    ...over,
  }
}

describe('isoWeekday', () => {
  it('lunes = 1, domingo = 7', () => {
    expect(isoWeekday('2026-09-07')).toBe(1) // lunes
    expect(isoWeekday('2026-09-13')).toBe(7) // domingo
  })
})

describe('addDaysISO', () => {
  it('cruza el cambio de mes', () => {
    expect(addDaysISO('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('stepsForDate', () => {
  it('solo incluye slots del día de la semana correcto', () => {
    const slots = [
      slot({ id: 'a', weekdays: [1, 3, 5] }), // lun/mié/vie
      slot({ id: 'b', weekdays: [7] }), // domingo
    ]
    const monday = stepsForDate({ date: '2026-09-07', slots, exceptions: [] })
    expect(monday.map((s) => s.slotId)).toEqual(['a'])
  })

  it('ordena por hora y luego por step_order', () => {
    const slots = [
      slot({ id: 'night', time_local: '22:00' }),
      slot({ id: 'am2', time_local: '08:00', step_order: 2 }),
      slot({ id: 'am1', time_local: '08:00', step_order: 1 }),
    ]
    const out = stepsForDate({ date: '2026-09-07', slots, exceptions: [] })
    expect(out.map((s) => s.slotId)).toEqual(['am1', 'am2', 'night'])
  })

  it('skip con slot elimina solo ese paso', () => {
    const slots = [slot({ id: 'a' }), slot({ id: 'b' })]
    const exceptions = [
      exception({ id: 'e1', date: '2026-09-07', kind: 'skip', slot_id: 'a' }),
    ]
    const out = stepsForDate({ date: '2026-09-07', slots, exceptions })
    expect(out.map((s) => s.slotId)).toEqual(['b'])
  })

  it('skip sin slot vacía el día (descanso)', () => {
    const slots = [slot({ id: 'a' }), slot({ id: 'b' })]
    const exceptions = [
      exception({ id: 'e1', date: '2026-09-07', kind: 'skip', slot_id: null }),
    ]
    expect(stepsForDate({ date: '2026-09-07', slots, exceptions })).toHaveLength(0)
  })

  it('replace cambia hora/producto conservando lo no especificado', () => {
    const slots = [slot({ id: 'a', time_local: '22:00', product_id: 'p1' })]
    const exceptions = [
      exception({
        id: 'e1',
        date: '2026-09-07',
        kind: 'replace',
        slot_id: 'a',
        time_local: '23:30',
      }),
    ]
    const [step] = stepsForDate({ date: '2026-09-07', slots, exceptions })
    expect(step.time).toBe('23:30')
    expect(step.productId).toBe('p1') // se conserva
    expect(step.slotId).toBe('a')
  })

  it('add inserta un paso puntual', () => {
    const slots = [slot({ id: 'a', time_local: '08:00' })]
    const exceptions = [
      exception({
        id: 'e1',
        date: '2026-09-07',
        kind: 'add',
        product_id: 'mascarilla',
        time_local: '20:00',
        title: 'Mascarilla',
      }),
    ]
    const out = stepsForDate({ date: '2026-09-07', slots, exceptions })
    expect(out.map((s) => s.title)).toEqual(['a', 'Mascarilla'])
    expect(out[1].source).toBe('exception')
    expect(out[1].exceptionId).toBe('e1')
  })

  it('ignora excepciones de otra fecha', () => {
    const slots = [slot({ id: 'a' })]
    const exceptions = [
      exception({ id: 'e1', date: '2026-09-08', kind: 'skip', slot_id: 'a' }),
    ]
    expect(stepsForDate({ date: '2026-09-07', slots, exceptions })).toHaveLength(1)
  })
})

describe('zonedWallTimeToUtc', () => {
  it('Europe/Madrid en invierno = UTC+1', () => {
    const d = zonedWallTimeToUtc(2026, 1, 15, 8, 0, 'Europe/Madrid')
    expect(d.toISOString()).toBe('2026-01-15T07:00:00.000Z')
  })

  it('Europe/Madrid en verano = UTC+2', () => {
    const d = zonedWallTimeToUtc(2026, 7, 15, 8, 0, 'Europe/Madrid')
    expect(d.toISOString()).toBe('2026-07-15T06:00:00.000Z')
  })
})

describe('nextOccurrences', () => {
  it('devuelve los avisos futuros dentro del horizonte, ordenados', () => {
    const slots = [
      slot({ id: 'am', time_local: '08:00', weekdays: [1, 2, 3, 4, 5, 6, 7] }),
      slot({ id: 'pm', time_local: '22:00', weekdays: [1, 2, 3, 4, 5, 6, 7] }),
    ]
    const from = new Date('2026-09-07T09:00:00Z') // 11:00 en Madrid (verano)
    const occ = nextOccurrences({
      from,
      tz: 'Europe/Madrid',
      horizonHours: 24,
      slots,
      exceptions: [],
    })
    // Quedan: hoy 22:00 y mañana 08:00 (mañana 22:00 cae fuera de 24h).
    expect(occ).toHaveLength(2)
    expect(occ[0].step.slotId).toBe('pm')
    expect(occ[0].instant.toISOString()).toBe('2026-09-07T20:00:00.000Z')
    expect(occ[1].step.slotId).toBe('am')
    expect(occ[1].instant.toISOString()).toBe('2026-09-08T06:00:00.000Z')
  })
})
