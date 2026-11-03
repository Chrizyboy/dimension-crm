import { describe, expect, it } from 'vitest'
import { VERKAUF_STANDARD } from './einstellung'
import { chfProKwp, richtpreis } from './richtpreis'

const e = VERKAUF_STANDARD.richtpreis

describe('richtpreis', () => {
  it('wählt die Preisstufe nach Leistung', () => {
    expect(chfProKwp(8, e)).toBe(2300)
    expect(chfProKwp(15, e)).toBe(1950)
    expect(chfProKwp(80, e)).toBe(1400)
  })

  it('rechnet aus der Dachfläche von sonnendach.ch mit Batterie', () => {
    const r = richtpreis({ kwp: null, dach: { sonnendach: { dachflaeche_m2: 60 } }, interesse: ['pv', 'batterie'] }, e)
    expect(r?.kwp).toBe(12)
    expect(r?.kwpQuelle).toBe('sonnendach')
    // 12 kWp × 1950 + 8400 = 31'800
    expect(r?.rappen).toBe(3_180_000)
    expect(r?.vonRappen).toBe(2_700_000)
    expect(r?.foerderungRappen).toBe(430_000)
    expect(r?.besuchNoetig).toBe(false)
  })

  it('nimmt die Leistung der Offerte vor der Dachfläche', () => {
    const r = richtpreis({ kwp: 40, dach: { website: { flaeche_m2: 60 } }, interesse: [] }, e)
    expect(r).toMatchObject({ kwp: 40, kwpQuelle: 'offerte', besuchNoetig: true })
  })

  it('gibt ohne Leistung und Dach nichts', () => {
    expect(richtpreis({ kwp: null, dach: {}, interesse: ['pv'] }, e)).toBeNull()
  })
})
