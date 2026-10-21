import { describe, expect, it } from 'vitest'
import { chfOderLeer, datumOderLeer, jsonText, kwpText } from './anzeige'

describe('Anzeige-Hilfen der Kundenakte', () => {
  it('zeigt Beträge, Daten und Leistung im Schweizer Format', () => {
    expect(chfOderLeer(4301200)).toBe("CHF 43'012.00")
    expect(chfOderLeer(null)).toBe('')
    expect(datumOderLeer('2026-10-21')).toBe('21.10.2026')
    expect(datumOderLeer(null)).toBe('')
    expect(kwpText(19.2)).toBe('19.2 kWp')
    expect(kwpText(10)).toBe('10 kWp')
  })

  it('liest alte JSON-Felder als Text', () => {
    expect(jsonText({ drt: 0 }, 'drt')).toBe('0')
    expect(jsonText({ drt: 'ok' }, 'drt')).toBe('ok')
    expect(jsonText(null, 'drt')).toBe('')
  })
})
