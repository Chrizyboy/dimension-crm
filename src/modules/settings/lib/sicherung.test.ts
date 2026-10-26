import { describe, expect, it } from 'vitest'
import { groesse, kurzInhalt, naechsterTermin } from './sicherung'

describe('Datensicherung: Termine und Anzeige', () => {
  it('nennt den nächsten Termin in Schweizer Zeit', () => {
    expect(naechsterTermin(new Date('2026-10-26T09:00:00Z'), [16, 12])).toEqual({ morgen: false, stunde: 12 }) // 10:00
    expect(naechsterTermin(new Date('2026-10-26T12:30:00Z'), [12, 16])).toEqual({ morgen: false, stunde: 16 }) // 13:30
    expect(naechsterTermin(new Date('2026-10-26T15:00:00Z'), [12, 16])).toEqual({ morgen: true, stunde: 12 }) // 16:00
    expect(naechsterTermin(new Date('2026-07-01T10:30:00Z'), [12, 16])).toEqual({ morgen: false, stunde: 16 }) // 12:30 Sommer
  })
  it('fasst den Inhalt zusammen', () => {
    expect(kurzInhalt({ kontakte: 686, verkaufschancen: 63, offerten: 608, rollen: 7 })).toEqual({
      kontakte: 686,
      leads: 63,
      offerten: 608,
      total: 1364,
    })
  })
  it('zeigt Grössen lesbar', () => {
    expect(groesse(1_115_918)).toBe('1.1 MB')
    expect(groesse(840 * 1024)).toBe('840 KB')
    expect(groesse(null)).toBe('–')
  })
})
