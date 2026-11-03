import { describe, expect, it } from 'vitest'
import { leadSchritte, schrittVonStand } from './schritte'
import { testGeschaeft } from './testgeschaeft'

describe('schritte', () => {
  it('ordnet die 16 Stände den sechs Schritten zu', () => {
    expect(schrittVonStand('lead_spaeter')).toBe('kontaktiert')
    expect(schrittVonStand('nach_termin')).toBe('termin')
    expect(schrittVonStand('nachfassen')).toBe('entscheid')
    expect(schrittVonStand('verbaut')).toBe('gewonnen')
    expect(schrittVonStand('kein')).toBe('aus')
  })

  it('markiert alles vor dem aktuellen Schritt als erledigt', () => {
    const s = leadSchritte(testGeschaeft({ stand: 'termin', eingangAm: '2026-10-01', terminAm: '2026-10-05T09:00' }))
    expect(s.map((x) => x.fertig)).toEqual([true, true, false, false, false, false])
    expect(s[2]?.am).toBe('2026-10-05T09:00')
    expect(s[3]?.am).toBeNull()
  })

  it('zeigt bei gewonnen alle Schritte erledigt', () => {
    expect(leadSchritte(testGeschaeft({ stand: 'angenommen' })).every((x) => x.fertig)).toBe(true)
  })

  it('zeigt bei verloren mit Offerte den Weg bis zum Entscheid', () => {
    const s = leadSchritte(testGeschaeft({ stand: 'verloren', offerteId: 'o1' }))
    expect(s.filter((x) => x.fertig)).toHaveLength(4)
  })
})
