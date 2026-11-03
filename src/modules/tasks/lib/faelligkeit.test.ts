import { describe, expect, it } from 'vitest'
import { dringlichkeit, gruppe, naechsterArbeitstag, naechsterMontag } from './faelligkeit'

describe('Fälligkeit', () => {
  it('ordnet nach Dringlichkeit', () => {
    expect(dringlichkeit(null, '2026-11-02')).toBe('ohne')
    expect(dringlichkeit('2026-11-01', '2026-11-02')).toBe('ueberfaellig')
    expect(dringlichkeit('2026-11-02', '2026-11-02')).toBe('heute')
    expect(dringlichkeit('2026-11-05', '2026-11-02')).toBe('bald')
    expect(dringlichkeit('2026-11-20', '2026-11-02')).toBe('spaeter')
  })

  it('gruppiert die Liste (Montag 2.11.2026)', () => {
    expect(gruppe('2026-10-30', '2026-11-02')).toBe('ueberfaellig')
    expect(gruppe('2026-11-02', '2026-11-02')).toBe('heute')
    expect(gruppe('2026-11-03', '2026-11-02')).toBe('morgen')
    expect(gruppe('2026-11-08', '2026-11-02')).toBe('woche')
    expect(gruppe('2026-11-09', '2026-11-02')).toBe('spaeter')
    expect(gruppe(null, '2026-11-02')).toBe('ohne')
  })

  it('verschiebt auf Arbeitstage', () => {
    expect(naechsterArbeitstag('2026-11-02')).toBe('2026-11-03')
    expect(naechsterArbeitstag('2026-11-06')).toBe('2026-11-09')
    expect(naechsterArbeitstag('2026-11-07')).toBe('2026-11-09')
    expect(naechsterMontag('2026-11-04')).toBe('2026-11-09')
    expect(naechsterMontag('2026-11-08')).toBe('2026-11-09')
  })
})
