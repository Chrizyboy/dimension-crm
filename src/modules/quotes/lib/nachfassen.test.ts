import { describe, expect, it } from 'vitest'
import type { Offerte } from '../types'
import { inTagen, nachfassStand, passtFaelligSeit, sortiereNachfassen, tageZwischen } from './nachfassen'

const HEUTE = '2026-10-21'
const o = (p: Partial<Offerte>) => ({ status: 'offeriert', faelligAm: null, entscheid: null, ...p }) as Offerte

describe('Nachfassen', () => {
  it('rechnet Tage über die Sommerzeit hinweg', () => {
    expect(tageZwischen('2026-10-21', '2026-10-26')).toBe(5)
    expect(inTagen(14, '2026-10-21')).toBe('2026-11-04')
  })

  it('erkennt heute, fällig, bald und vertagt', () => {
    expect(nachfassStand(o({ faelligAm: HEUTE }), HEUTE)).toMatchObject({ art: 'heute' })
    expect(nachfassStand(o({ faelligAm: '2026-10-01' }), HEUTE)).toMatchObject({ art: 'faellig', tage: 20 })
    expect(nachfassStand(o({ faelligAm: '2026-10-25' }), HEUTE)).toMatchObject({ art: 'in', tage: 4 })
    expect(nachfassStand(o({ faelligAm: '2026-11-30', entscheid: 'vertagt' }), HEUTE)).toMatchObject({
      art: 'vertagt',
      tage: 40,
    })
    expect(nachfassStand(o({ status: 'angenommen' }), HEUTE)).toBeNull()
  })

  it('filtert «Fällig seit» wie V193', () => {
    const s = (tage: number) => nachfassStand(o({ faelligAm: inTagen(-tage, HEUTE) }), HEUTE)
    expect(passtFaelligSeit(s(10), 'bis30')).toBe(true)
    expect(passtFaelligSeit(s(45), 'bis90')).toBe(true)
    expect(passtFaelligSeit(s(45), 'bis30')).toBe(false)
    expect(passtFaelligSeit(s(200), 'mehr180')).toBe(true)
    expect(passtFaelligSeit(nachfassStand(o({ faelligAm: inTagen(7, HEUTE) }), HEUTE), 'bald')).toBe(true)
    expect(passtFaelligSeit(nachfassStand(o({ faelligAm: inTagen(20, HEUTE) }), HEUTE), 'bald')).toBe(false)
  })

  it('sortiert nach Betrag und Nummer', () => {
    const liste = [
      o({ nummer: '200010', betragRappen: 100, name: 'B' }),
      o({ nummer: '200002', betragRappen: 900, name: 'A' }),
    ]
    expect(sortiereNachfassen(liste, 'betrag').map((x) => x.nummer)).toEqual(['200002', '200010'])
    expect(sortiereNachfassen(liste, 'nr').map((x) => x.nummer)).toEqual(['200002', '200010'])
  })
})
