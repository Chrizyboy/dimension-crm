import { describe, expect, it } from 'vitest'
import { alsZahl, formatMenge, inTagen } from './anzeige'

describe('Einkauf: Anzeige', () => {
  it('zeigt Mengen ohne unnötige Nachkommastellen', () => {
    expect(formatMenge(12)).toBe('12')
    expect(formatMenge(2.5)).toBe('2.5')
    expect(formatMenge(1250)).toBe('1’250')
    expect(formatMenge(null)).toBe('0')
  })

  it('liest Zahlen mit Komma, Punkt und Tausender-Apostroph', () => {
    expect(alsZahl('2,5')).toBe(2.5)
    expect(alsZahl("1'250")).toBe(1250)
    expect(alsZahl(formatMenge(1250))).toBe(1250)
    expect(alsZahl('-2')).toBe(-2)
    expect(alsZahl('')).toBeNull()
    expect(alsZahl('abc')).toBeNull()
  })

  it('rechnet Tage zum Datum dazu', () => {
    expect(inTagen(new Date(2026, 9, 30), 3)).toBe('2026-11-02')
  })
})
