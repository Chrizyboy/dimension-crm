import { describe, expect, it } from 'vitest'
import type { Katalog } from '../types'
import {
  brauchtBestandsaufnahme,
  kuendbarBis,
  laeuftBis,
  mindestBis,
  rabattProzent,
  stufe,
  stufeText,
  tarif,
} from './tarif'

const katalog = {
  stufen_kwp: [20, 50, 100],
  pakete: [
    { id: 'essentiel', preise_rappen: [14900, 19900, 29000] },
    { id: 'comfort', preise_rappen: [34900, 44900, 65000] },
    { id: 'premium', preise_rappen: [54900, 69000, 95000] },
  ],
} as unknown as Katalog

describe('Tarif nach Website', () => {
  it('wählt die Stufe nach kWp', () => {
    expect(stufe(katalog.stufen_kwp, 11.2)).toBe(0)
    expect(stufe(katalog.stufen_kwp, 20)).toBe(0)
    expect(stufe(katalog.stufen_kwp, 20.1)).toBe(1)
    expect(stufe(katalog.stufen_kwp, 100)).toBe(2)
    expect(stufe(katalog.stufen_kwp, 118)).toBeNull()
  })
  it('liefert die Preise der Website', () => {
    expect(tarif(katalog, 'comfort', 11.2)).toBe(34900)
    expect(tarif(katalog, 'premium', 42)).toBe(69000)
    expect(tarif(katalog, 'essentiel', 86)).toBe(29000)
    expect(tarif(katalog, 'premium', 120)).toBeNull()
    expect(tarif(katalog, 'gold', 10)).toBeNull()
  })
  it('beschreibt die Stufe', () => {
    expect(stufeText(katalog.stufen_kwp, 11)).toBe('≤ 20 kWp')
    expect(stufeText(katalog.stufen_kwp, 42)).toBe('20–50 kWp')
    expect(stufeText(katalog.stufen_kwp, 400, 'kWc')).toBe('> 100 kWc')
  })
  it('rechnet den Rabatt', () => {
    expect(rabattProzent(34900, 31400)).toBe(10)
    expect(rabattProzent(34900, 34900)).toBe(0)
    expect(rabattProzent(null, 30000)).toBe(0)
  })
})

describe('Laufzeit nach Bedingungen', () => {
  it('Mindestlaufzeit 3 Jahre, danach +1 Jahr', () => {
    expect(mindestBis('2023-11-01', 3)).toBe('2026-10-31')
    expect(laeuftBis('2023-11-01', 3, '2026-10-31')).toBe('2026-10-31')
    expect(laeuftBis('2023-11-01', 3, '2026-11-02')).toBe('2027-10-31')
    expect(laeuftBis('2026-12-01', 3, '2026-11-02')).toBe('2029-11-30')
    expect(laeuftBis(null, 3, '2026-11-02')).toBeNull()
  })
  it('kündbar bis 3 Monate vor Ablauf', () => {
    expect(kuendbarBis('2027-10-31', 3)).toBe('2027-07-31')
  })
  it('Bestandsaufnahme bei Fremdanlage oder älter als 2 Jahre', () => {
    expect(brauchtBestandsaufnahme(true, 2026, 2026, 2)).toBe(true)
    expect(brauchtBestandsaufnahme(false, 2023, 2026, 2)).toBe(true)
    expect(brauchtBestandsaufnahme(false, 2025, 2026, 2)).toBe(false)
    expect(brauchtBestandsaufnahme(false, null, 2026, 2)).toBe(false)
  })
})
