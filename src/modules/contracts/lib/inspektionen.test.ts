import { describe, expect, it } from 'vitest'
import type { Vertrag } from '../types'
import { inspektionen, inspektionZahlen } from './inspektionen'

const v = (x: Partial<Vertrag>): Vertrag =>
  ({
    id: x.id ?? 'a',
    status: 'aktiv',
    naechste_wartung: '2026-11-20',
    termin_von: null,
    angekuendigt_am: null,
    ...x,
  }) as Vertrag

const heute = new Date('2026-11-02T12:00:00')

describe('Inspektionen planen', () => {
  const liste = [
    v({ id: 'faellig' }),
    v({ id: 'spaet', naechste_wartung: '2027-06-01' }),
    v({ id: 'geplant', naechste_wartung: '2027-06-01', termin_von: '2026-11-10T07:00:00Z', angekuendigt_am: 'x' }),
    v({ id: 'essentiel', naechste_wartung: null }),
    v({ id: 'beendet', status: 'beendet' }),
  ]
  it('zeigt Fällige und Geplante, sortiert nach Tag', () => {
    expect(inspektionen(liste, heute, 'alle').map((x) => x.id)).toEqual(['geplant', 'faellig'])
  })
  it('filtert offen und geplant', () => {
    expect(inspektionen(liste, heute, 'offen').map((x) => x.id)).toEqual(['faellig'])
    expect(inspektionen(liste, heute, 'geplant').map((x) => x.id)).toEqual(['geplant'])
  })
  it('zählt', () => {
    expect(inspektionZahlen(liste, heute)).toEqual({ offen: 1, geplant: 1, angekuendigt: 1 })
  })
})
