import { describe, expect, it } from 'vitest'
import {
  arbeitstage,
  minuten,
  monatsTage,
  plusTage,
  stundenText,
  tageText,
  wochenStart,
  zeitpunkt,
  zuerich,
} from './zeit'

describe('Zeiterfassung rechnen', () => {
  it('findet den Montag der Woche', () => {
    expect(wochenStart('2026-11-11')).toBe('2026-11-09')
    expect(wochenStart('2026-11-15')).toBe('2026-11-09')
    expect(wochenStart('2026-11-16')).toBe('2026-11-16')
  })

  it('rechnet Schweizer Zeit im Winter und im Sommer', () => {
    expect(zeitpunkt('2026-11-11', '07:30')).toBe('2026-11-11T06:30:00.000Z')
    expect(zeitpunkt('2026-07-01', '07:30')).toBe('2026-07-01T05:30:00.000Z')
    expect(zuerich('2026-11-11T06:30:00Z')).toEqual({ datum: '2026-11-11', zeit: '07:30' })
  })

  it('zeigt Stunden und Saldo', () => {
    expect(stundenText(8.5)).toBe('8:30')
    expect(stundenText(12.25, true)).toBe('+12:15')
    expect(stundenText(-0.75, true)).toBe('−0:45')
    expect(stundenText(0, true)).toBe('0:00')
    expect(tageText(20.5)).toBe('20.5')
    expect(tageText(8)).toBe('8')
  })

  it('zieht die Pause ab', () => {
    expect(minuten('2026-11-09T06:00:00Z', '2026-11-09T15:30:00Z', 60)).toBe(510)
  })

  it('zählt Arbeitstage ohne Wochenende und Feiertage', () => {
    expect(arbeitstage('2026-12-21', '2026-12-31', ['2026-12-25', '2026-12-26'])).toBe(8)
    expect(arbeitstage('2026-11-13', '2026-11-13', [], true)).toBe(0.5)
    expect(arbeitstage('2026-11-14', '2026-11-13', [])).toBe(0)
  })

  it('kennt die Tage eines Monats', () => {
    expect(monatsTage(2026, 2)).toHaveLength(28)
    expect(monatsTage(2028, 2).at(-1)).toBe('2028-02-29')
    expect(plusTage('2026-12-31', 1)).toBe('2027-01-01')
  })
})
