import { describe, expect, it } from 'vitest'
import { auswertung } from './auswertung'
import { offerte } from './testOfferte'

const heute = '2026-11-02'

describe('auswertung', () => {
  const liste = [
    offerte({ id: 'a', verantwortlichName: 'Andy', angebotAm: '2026-10-01', betragRappen: 2_000_000 }),
    offerte({
      id: 'b',
      verantwortlichName: 'Andy',
      angebotAm: '2026-09-20',
      phase: 'gewonnen',
      entscheidAm: '2026-10-10',
      betragRappen: 3_000_000,
      konkurrenz: 'Helion',
    }),
    offerte({
      id: 'c',
      verantwortlichName: 'Chris',
      angebotAm: '2026-10-05',
      phase: 'verloren',
      entscheidAm: '2026-10-25',
      verlustgrund: 'Preis',
      konkurrenz: 'Helion',
    }),
    offerte({
      id: 'd',
      verantwortlichName: null,
      angebotAm: '2026-05-01',
      phase: 'verloren',
      entscheidAm: '2026-05-20',
    }),
  ]

  it('zählt offeriert, gewonnen, verloren und die Quote im Zeitraum', () => {
    const a = auswertung(liste, 90, 'ohne', heute)
    expect(a.total.offeriert).toBe(3)
    expect(a.total.gewonnen).toBe(1)
    expect(a.total.verloren).toBe(1)
    expect(a.total.quote).toBe(50)
    expect(a.total.tageBisEntscheid).toBe(20)
  })

  it('gruppiert je Person, Alte ohne Bewegung fallen weg', () => {
    const a = auswertung(liste, 90, 'ohne', heute)
    expect(a.personen.map((p) => [p.name, p.gewonnen, p.verloren])).toEqual([
      ['Andy', 1, 0],
      ['Chris', 0, 1],
    ])
  })

  it('sammelt Verlustgründe und Konkurrenz', () => {
    const a = auswertung(liste, 90, 'ohne', heute)
    expect(a.verlustgruende).toEqual([{ grund: 'Preis', anzahl: 1 }])
    expect(a.konkurrenz).toEqual([{ name: 'Helion', anzahl: 2 }])
  })
})
