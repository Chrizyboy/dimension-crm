import { describe, expect, it } from 'vitest'
import { dauerText, heute, minuten, plusTage, stundenText, summeJePerson, wochenStart, zuerich } from './zeit'

describe('Zeiten', () => {
  it('zeigt Schweizer Zeit, auch im Sommer', () => {
    expect(zuerich('2026-07-01T05:30:00Z')).toEqual({ datum: '2026-07-01', zeit: '07:30' })
    expect(zuerich('2026-12-31T23:30:00Z')).toEqual({ datum: '2027-01-01', zeit: '00:30' })
    expect(heute(new Date('2026-10-21T22:30:00Z'))).toBe('2026-10-22')
  })

  it('rechnet Tage und Wochen', () => {
    expect(plusTage('2026-10-31', 1)).toBe('2026-11-01')
    expect(plusTage('2026-03-29', -1)).toBe('2026-03-28')
    expect(wochenStart('2026-10-22')).toBe('2026-10-19')
    expect(wochenStart('2026-10-25')).toBe('2026-10-19')
    expect(wochenStart('2026-10-19')).toBe('2026-10-19')
  })

  it('zieht die Pause ab und wird nie negativ', () => {
    const z = { start: '2026-10-22T05:00:00Z', stopp: '2026-10-22T14:15:00Z', pause_min: 45 }
    expect(minuten(z)).toBe(510)
    expect(dauerText(510)).toBe('8:30 h')
    expect(stundenText(510)).toBe('8.50')
    expect(stundenText(25)).toBe('0.42')
    expect(minuten({ start: '2026-10-22T05:00:00Z', stopp: '2026-10-22T05:10:00Z', pause_min: 30 })).toBe(0)
  })

  it('rechnet laufende Zeiten bis jetzt', () => {
    const jetzt = new Date('2026-10-22T07:00:00Z')
    expect(minuten({ start: '2026-10-22T06:15:00Z', stopp: null }, jetzt)).toBe(45)
  })

  it('summiert je Person', () => {
    const s = summeJePerson([
      { person_id: 'b', person: 'Zoe', start: '2026-10-22T06:00:00Z', stopp: '2026-10-22T07:00:00Z' },
      { person_id: 'a', person: 'Anna', start: '2026-10-22T06:00:00Z', stopp: '2026-10-22T06:30:00Z' },
      { person_id: 'b', person: 'Zoe', start: '2026-10-23T06:00:00Z', stopp: '2026-10-23T06:30:00Z' },
    ])
    expect(s).toEqual([
      { person_id: 'a', person: 'Anna', minuten: 30 },
      { person_id: 'b', person: 'Zoe', minuten: 90 },
    ])
  })
})
