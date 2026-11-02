import { describe, expect, it } from 'vitest'
import { ablauf, bereichVon, fensterText, nachBereich, passtZuSuche } from './bereich'

const TAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

describe('bereichVon', () => {
  it('ordnet Auslöser den Bereichen zu', () => {
    expect(bereichVon('lead.ohne_kontakt')).toBe('verkauf')
    expect(bereichVon('offerte.gesendet')).toBe('offerten')
    expect(bereichVon('auftrag.erstellt')).toBe('projekte')
    expect(bereichVon('garantie.laeuft_ab')).toBe('service')
    expect(bereichVon('rechnung.bezahlt')).toBe('finanzen')
    expect(bereichVon('zeit.monatlich')).toBe('marketing')
    expect(bereichVon('unbekannt')).toBe('marketing')
  })

  it('gruppiert in fester Reihenfolge ohne leere Bereiche', () => {
    const g = nachBereich([
      { ausloeser: 'rechnung.bezahlt' },
      { ausloeser: 'lead.neu' },
      { ausloeser: 'lead.ohne_kontakt' },
    ])
    expect(g.map(([b, l]) => [b, l.length])).toEqual([
      ['verkauf', 2],
      ['finanzen', 1],
    ])
  })
})

describe('passtZuSuche', () => {
  const a = { name_de: 'Offerte nachfassen', name_fr: 'Relancer l’offre', beschreibung_de: null, beschreibung_fr: null }
  it('sucht in beiden Sprachen, ohne Gross/klein', () => {
    expect(passtZuSuche(a, 'NACHFASSEN')).toBe(true)
    expect(passtZuSuche(a, 'relancer')).toBe(true)
    expect(passtZuSuche(a, 'rechnung')).toBe(false)
    expect(passtZuSuche(a, '  ')).toBe(true)
  })
})

describe('ablauf', () => {
  it('zählt Wartezeiten zusammen und lässt Prüfen weg', () => {
    expect(
      ablauf([
        { art: 'aufgabe' },
        { art: 'warten', tage: 3, arbeitstage: true },
        { art: 'pruefen', bedingungen: [] },
        { art: 'mail' },
        { art: 'warten', tage: 7 },
        { art: 'sms' },
      ]),
    ).toEqual([
      { tage: 0, arbeitstage: false, art: 'aufgabe' },
      { tage: 3, arbeitstage: true, art: 'mail' },
      { tage: 10, arbeitstage: true, art: 'sms' },
    ])
  })
})

describe('fensterText', () => {
  it('zeigt Mo–Fr mit Zeit, «immer» als null', () => {
    expect(fensterText({ tage: [1, 2, 3, 4, 5], von: '08:00', bis: '18:00' }, TAGE)).toBe('Mo–Fr 08:00–18:00')
    expect(fensterText({ tage: [1, 3], von: '09:00', bis: '12:00' }, TAGE)).toBe('Mo, Mi 09:00–12:00')
    expect(fensterText({ immer: true }, TAGE)).toBeNull()
    expect(fensterText(null, TAGE)).toBeNull()
  })
})
