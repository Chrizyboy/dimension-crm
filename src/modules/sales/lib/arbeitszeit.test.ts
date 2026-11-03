import { describe, expect, it } from 'vitest'
import { arbeitsminuten, inMonaten, naechsterArbeitstag } from './arbeitszeit'
import { VERKAUF_STANDARD } from './einstellung'

const az = VERKAUF_STANDARD

describe('arbeitsminuten', () => {
  it('zählt innerhalb eines Arbeitstags', () => {
    // Montag 2.11.2026, 09:00 bis 09:20 Schweizer Zeit (UTC+1)
    expect(arbeitsminuten(new Date('2026-11-02T08:00:00Z'), new Date('2026-11-02T08:20:00Z'), az)).toBe(20)
  })

  it('zählt nicht über Nacht und Wochenende', () => {
    // Freitag 17:50 bis Montag 07:40: 10 + 10 Minuten
    expect(arbeitsminuten(new Date('2026-10-30T16:50:00Z'), new Date('2026-11-02T06:40:00Z'), az)).toBe(20)
  })

  it('zählt vor Arbeitsbeginn nichts', () => {
    expect(arbeitsminuten(new Date('2026-11-02T05:00:00Z'), new Date('2026-11-02T06:30:00Z'), az)).toBe(0)
  })

  it('lässt Feiertage aus', () => {
    const mitFeiertag = { ...az, feiertage: ['2026-11-02'] }
    expect(arbeitsminuten(new Date('2026-11-02T08:00:00Z'), new Date('2026-11-02T09:00:00Z'), mitFeiertag)).toBe(0)
  })
})

describe('naechsterArbeitstag', () => {
  it('springt über das Wochenende', () => {
    expect(naechsterArbeitstag('2026-10-30', az)).toBe('2026-11-02')
    expect(naechsterArbeitstag('2026-11-02', az)).toBe('2026-11-03')
  })
  it('rechnet Monate weiter', () => {
    expect(inMonaten('2026-11-02', 12)).toBe('2027-11-02')
  })
})
