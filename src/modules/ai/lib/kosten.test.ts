import { describe, expect, it } from 'vitest'
import { anteil, monatsGrenzen, rappenAus } from './kosten'

describe('KI-Kosten', () => {
  it('Tausendstel-Rappen in Rappen', () => {
    expect(rappenAus(18_386)).toBe(18)
  })
  it('Monatsgrenzen, auch Februar', () => {
    expect(monatsGrenzen('2026-02')).toEqual({ von: '2026-02-01', bis: '2026-02-28' })
    expect(monatsGrenzen('2026-10')).toEqual({ von: '2026-10-01', bis: '2026-10-31' })
  })
  it('Anteil am Limit, höchstens 100', () => {
    expect(anteil(500, 1000)).toBe(50)
    expect(anteil(5000, 1000)).toBe(100)
    expect(anteil(5, 0)).toBe(0)
  })
})
