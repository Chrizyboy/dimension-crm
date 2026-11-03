import { describe, expect, it } from 'vitest'
import type { Belegung } from '../types'
import { konflikte, montag, plusTage, tage } from './belegung'

const b = (teil: Partial<Belegung>): Belegung => ({
  quelle: 'hand',
  reservierung_id: crypto.randomUUID(),
  fahrzeug_id: null,
  geraet_id: null,
  von: '2026-11-02',
  bis: '2026-11-02',
  art: 'hand',
  einsatz_id: null,
  projekt_id: null,
  person_id: null,
  zweck: null,
  projekt: null,
  ...teil,
})

describe('Tage', () => {
  it('rechnet Kalendertage und den Montag', () => {
    expect(plusTage('2026-10-30', 3)).toBe('2026-11-02')
    expect(montag('2026-11-05')).toBe('2026-11-02')
    expect(montag('2026-11-08')).toBe('2026-11-02')
    expect(tage('2026-11-02', 3)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04'])
  })
})

describe('konflikte', () => {
  it('findet dieselbe Sache am selben Tag doppelt', () => {
    const liste = [
      b({ geraet_id: 'lift', von: '2026-11-02', bis: '2026-11-05' }),
      b({ geraet_id: 'lift', von: '2026-11-05', bis: '2026-11-05' }),
      b({ fahrzeug_id: 'bus', von: '2026-11-02', bis: '2026-11-04' }),
      b({ geraet_id: 'gurt', von: '2026-11-05', bis: '2026-11-05' }),
    ]
    const k = konflikte(liste, '2026-11-02', '2026-11-06')
    expect([...k.entries()]).toEqual([['g:lift', ['2026-11-05']]])
  })
})
