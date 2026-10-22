import { describe, expect, it } from 'vitest'
import { empfaengerZeile, fristTon, nurDatum, ortKurz, tageBis } from './anzeige'

describe('Anzeige Ausschreibungen', () => {
  const heute = new Date(2026, 9, 22, 9, 0)

  it('zählt Tage bis zur Frist, unabhängig von der Uhrzeit', () => {
    expect(tageBis('2026-10-22', heute)).toBe(0)
    expect(tageBis('2026-10-29T12:00:00+01:00', heute)).toBe(7)
    expect(tageBis('2026-10-20', heute)).toBe(-2)
    expect(tageBis(null, heute)).toBeNull()
  })

  it('färbt nahe Fristen', () => {
    expect(fristTon(null)).toBe('neutral')
    expect(fristTon(new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10))).toBe('kritisch')
    expect(fristTon(new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10))).toBe('warnung')
  })

  it('zeigt Ort und Empfänger kurz', () => {
    expect(ortKurz({ gemeinde: 'Lenzburg', kanton: 'AG' })).toBe('Lenzburg AG')
    expect(ortKurz({ gemeinde: null, kanton: null })).toBe('–')
    expect(ortKurz({ gemeinde: 'Muri AG', kanton: 'AG' })).toBe('Muri AG')
    expect(ortKurz({ gemeinde: 'Wohlen (AG)', kanton: 'AG' })).toBe('Wohlen (AG)')
    expect(ortKurz({ gemeinde: 'Agno', kanton: 'TI' })).toBe('Agno TI')
    expect(nurDatum('2026-11-15')).toBe(true)
    expect(nurDatum('2026-11-15T09:30:00')).toBe(false)
    expect(empfaengerZeile({ an: 'info@test.ch', empfaenger: 'Test AG' })).toBe('Test AG · info@test.ch')
  })
})
