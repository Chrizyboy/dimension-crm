import { describe, expect, it } from 'vitest'
import { erlaubteZiele, istLiegengeblieben, liegtSeit, standBedarf, summe } from './geschaeft'
import { testGeschaeft } from './testgeschaeft'

describe('liegtSeit', () => {
  it('zählt ab Eingang, wenn noch niemand Kontakt hatte', () => {
    const g = testGeschaeft({ eingangAm: '2026-10-10', letzterKontakt: null })
    expect(liegtSeit(g, '2026-10-21')).toBe(11)
    expect(istLiegengeblieben(g, '2026-10-21')).toBe(true)
  })

  it('zählt ab dem letzten Kontakt und ist erst ab 5 Tagen rot', () => {
    const g = testGeschaeft({ stand: 'lead_offen', eingangAm: '2026-10-01', letzterKontakt: '2026-10-18T09:00:00Z' })
    expect(liegtSeit(g, '2026-10-21')).toBe(3)
    expect(istLiegengeblieben(g, '2026-10-21')).toBe(false)
  })

  it('gilt nur für neue und offene Leads', () => {
    expect(liegtSeit(testGeschaeft({ stand: 'termin', eingangAm: '2026-01-01' }), '2026-10-21')).toBeNull()
  })
})

describe('Stand wechseln', () => {
  it('fragt je nach Ziel Grund, Datum, Termin oder Richtofferte ab', () => {
    expect(standBedarf('lead_offen', 'kein')).toBe('grund')
    expect(standBedarf('lead_offen', 'lead_spaeter')).toBe('datumGrund')
    expect(standBedarf('lead_neu', 'termin')).toBe('termin')
    expect(standBedarf('lead_offen', 'offerte')).toBe('richtofferte')
    expect(standBedarf('nach_termin', 'offerte')).toBe('nichts')
  })

  it('lässt Projekte nicht ziehen und Leads nicht direkt auf «offeriert»', () => {
    expect(erlaubteZiele(testGeschaeft({ projektId: 'p1' })).size).toBe(0)
    const lead = erlaubteZiele(testGeschaeft({}))
    expect(lead.has('termin')).toBe(true)
    expect(lead.has('offeriert')).toBe(false)
  })
})

it('summiert Wert und Leistung einer Spalte', () => {
  const s = summe([testGeschaeft({ wertRappen: 1_250_000, kwp: 10.25 }), testGeschaeft({ kwp: 4.1 })])
  expect(s).toEqual({ anzahl: 2, rappen: 1_250_000, kwp: 14.4 })
})
