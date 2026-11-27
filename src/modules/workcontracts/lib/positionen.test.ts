import { describe, expect, it } from 'vitest'
import { aufteilen, positionenAusDb, positionText } from './positionen'

describe('Positionen der Offerte', () => {
  it('liest die Stückliste und überspringt Unbekanntes', () => {
    const p = positionenAusDb([
      { bezeichnung: ' Batterie 5 kWh ', menge: '2', einheit: 'Stk', art: 'material', optional: false },
      { bezeichnung: '', menge: 1 },
      'quatsch',
      { bezeichnung: 'Montage', menge: 1, einheit: 'pauschal', art: 'leistung', optional: true },
    ])
    expect(p).toEqual([
      { bezeichnung: 'Batterie 5 kWh', menge: 2, einheit: 'Stk', art: 'material', optional: false },
      { bezeichnung: 'Montage', menge: 1, einheit: 'pauschal', art: 'leistung', optional: true },
    ])
    expect(positionenAusDb(null)).toEqual([])
  })

  it('teilt in bestellt und offene Optionen', () => {
    const p = positionenAusDb([
      { bezeichnung: 'A', menge: 1 },
      { bezeichnung: 'B', menge: 1, optional: true },
      { bezeichnung: 'C', menge: 1, optional: true },
    ])
    const { bestellt, offen } = aufteilen(p, ['C'])
    expect(bestellt.map((x) => x.bezeichnung)).toEqual(['A', 'C'])
    expect(offen.map((x) => x.bezeichnung)).toEqual(['B'])
  })

  it('schreibt Menge und Einheit nur, wo sie etwas sagen', () => {
    const p = (menge: number, einheit: string) =>
      positionText({ bezeichnung: 'X', menge, einheit, art: 'material', optional: false }, false)
    expect(p(1, 'Stk')).toBe('X')
    expect(p(2, 'Stk')).toBe('2 × X')
    expect(p(1, 'pauschal')).toBe('X')
    expect(p(12.5, 'm')).toBe('12.5 m X')
  })
})
