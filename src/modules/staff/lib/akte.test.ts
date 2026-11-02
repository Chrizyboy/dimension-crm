import { describe, expect, it } from 'vitest'
import { ahvGueltig, akteFristen, formatAhv, formatIban, ibanGueltig, probezeitVorschlag } from './akte'

describe('Personal-Akte', () => {
  it('prüft die AHV-Nummer mit Prüfziffer', () => {
    expect(ahvGueltig('756.9217.0769.85')).toBe(true)
    expect(ahvGueltig('7569217076985')).toBe(true)
    expect(ahvGueltig('756.9217.0769.86')).toBe(false)
    expect(ahvGueltig('123.4567.8901.23')).toBe(false)
    expect(formatAhv('7569217076985')).toBe('756.9217.0769.85')
  })

  it('prüft die IBAN mit Modulo 97', () => {
    expect(ibanGueltig('CH93 0076 2011 6238 5295 7')).toBe(true)
    expect(ibanGueltig('CH93 0076 2011 6238 5295 8')).toBe(false)
    expect(ibanGueltig('DE89370400440532013000')).toBe(true)
    expect(ibanGueltig('CH930076201162385295')).toBe(false)
    expect(formatIban('ch9300762011623852957')).toBe('CH93 0076 2011 6238 5295 7')
  })

  it('schlägt die Probezeit vor (Eintritt + 3 Monate − 1 Tag)', () => {
    expect(probezeitVorschlag('2024-04-01')).toBe('2024-06-30')
    expect(probezeitVorschlag('2026-11-15', 1)).toBe('2026-12-14')
  })

  it('zeigt Fristen mit Stand', () => {
    const f = akteFristen(
      { probezeit_bis: '2026-10-20', bewilligung_bis: '2026-12-01', naechstes_gespraech: '2027-06-01' },
      '2026-11-02',
    )
    expect(f).toEqual([
      { art: 'probezeit', datum: '2026-10-20', stand: 'vorbei' },
      { art: 'bewilligung', datum: '2026-12-01', stand: 'bald' },
      { art: 'gespraech', datum: '2027-06-01', stand: 'offen' },
    ])
    expect(akteFristen({ probezeit_bis: '2026-01-01' }, '2026-11-02')).toEqual([])
  })
})
