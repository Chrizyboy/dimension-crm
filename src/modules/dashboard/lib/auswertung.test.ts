import { describe, expect, it } from 'vitest'
import type { Fakt } from '../types'
import { nachBereich, nachPerson, quellen, quote, zelle } from './auswertung'
import { alleFaecher, balken, fachText, kalenderwoche, vonBis } from './zeitraum'

const f = (schluessel: string, extra: Partial<Fakt> = {}): Fakt => ({
  schluessel,
  art: 'offerte',
  id: Math.random().toString(36),
  datum: '2026-10-20',
  standort: 'bulle',
  person_id: null,
  betrag_rappen: null,
  quelle: null,
  name: null,
  nummer: null,
  ort: null,
  stand: null,
  ...extra,
})

describe('Zeitraum', () => {
  it('rechnet von/bis ab heute', () => {
    expect(vonBis('monat', '2026-10-24')).toEqual({ von: '2026-10-01', bis: '2026-10-24' })
    expect(vonBis('quartal', '2026-11-03').von).toBe('2026-10-01')
    expect(vonBis('jahr', '2026-10-24').von).toBe('2026-01-01')
    expect(vonBis('12m', '2026-10-24').von).toBe('2025-10-25')
  })

  it('kennt Kalenderwochen und Beschriftungen', () => {
    expect(kalenderwoche('2026-10-26')).toBe(44)
    expect(kalenderwoche('2027-01-01')).toBe(53)
    expect(fachText('jahr', '2026-10')).toBe('10.2026')
    expect(fachText('alle', '2026-Q4')).toBe('Q4 2026')
  })

  it('füllt leere Fächer auf', () => {
    expect(alleFaecher('jahr', '2026-01-01', '2026-03-15')).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(alleFaecher('quartal', '2026-10-01', '2026-10-14')).toHaveLength(3)
  })

  it('zählt gesendete Offerten pro Fach und Standort', () => {
    const b = balken(
      [f('gesendet', { datum: '2026-02-03' }), f('gesendet', { datum: '2026-02-09', standort: 'muri' }), f('offen')],
      'jahr',
      '2026-01-01',
      '2026-03-01',
    )
    expect(b.map((x) => [x.text, x.muri.length, x.bulle.length])).toEqual([
      ['01.2026', 0, 0],
      ['02.2026', 1, 1],
      ['03.2026', 0, 0],
    ])
  })
})

describe('Auswertung', () => {
  const fakten = [
    f('gesendet', { betrag_rappen: 2_000_000 }),
    f('gesendet', { betrag_rappen: 1_000_000, standort: 'muri', person_id: 'p1' }),
    f('angenommen', { betrag_rappen: 2_100_000 }),
    f('verloren'),
    f('verloren'),
    f('verloren', { standort: null }),
  ]

  it('zählt, summiert und rechnet die Quote', () => {
    expect(zelle(fakten, { id: 'a', schluessel: 'gesendet', mass: 'anzahl' }).wert).toBe(2)
    expect(zelle(fakten, { id: 'b', schluessel: 'gesendet', mass: 'summe' }).wert).toBe(3_000_000)
    const q = zelle(fakten, { id: 'q', schluessel: 'angenommen', mass: 'quote' })
    expect(q.wert).toBe(25)
    expect(q.fakten).toHaveLength(4)
    expect(quote([])).toBeNull()
  })

  it('filtert nach Standort', () => {
    expect(nachBereich(fakten, 'muri')).toHaveLength(1)
    expect(nachBereich(fakten, 'alle')).toHaveLength(6)
  })

  it('sammelt Unbekanntes unter «Übrige»', () => {
    const s = nachPerson(fakten, [{ id: 'p1' }, { id: 'p2' }])
    expect(s.map((x) => [x.id, x.fakten.length])).toEqual([
      ['p1', 1],
      ['uebrige', 5],
    ])
  })

  it('rechnet Lead-Quellen mit Kosten pro Auftrag', () => {
    const l = (s: string, q: string, b: number | null = null) => f(s, { art: 'lead', quelle: q, betrag_rappen: b })
    const z = quellen(
      [
        l('leads_neu', 'solar_guide'),
        l('leads_neu', 'solar_guide'),
        l('leads_neu', 'solar_guide'),
        l('leads_neu', 'solar_guide'),
        l('quelle_auftrag', 'solar_guide', 3_000_000),
        l('leads_neu', 'website'),
      ],
      { solar_guide: 8500 },
    )
    expect(z[0]).toMatchObject({
      quelle: 'solar_guide',
      quote: 25,
      umsatz_rappen: 3_000_000,
      kosten_total_rappen: 34_000,
      kosten_auftrag_rappen: 34_000,
    })
    expect(z[1]?.kosten_lead_rappen).toBeNull()
  })
})
