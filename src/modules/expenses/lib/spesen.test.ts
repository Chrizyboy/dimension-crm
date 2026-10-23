import { describe, expect, it } from 'vitest'
import type { Spese } from '../types'
import { filtern, mailZeilen, offenJePerson, spesenCsv, summe } from './spesen'

const s = (x: Partial<Spese>): Spese => ({
  id: crypto.randomUUID(),
  person_id: 'p1',
  person: 'Lea Exemple',
  kuerzel: 'LE',
  datum: '2026-10-20',
  betrag_rappen: 1250,
  kategorie: 'Parkieren',
  zweck: 'Kundentermin',
  notiz: null,
  beleg_id: null,
  beleg_name: null,
  status: 'eingereicht',
  ausbezahlt_am: null,
  ausbezahlt_von: null,
  storniert_am: null,
  storniert_von: null,
  storniert_grund: null,
  erstellt_am: '2026-10-20T10:00:00Z',
  ...x,
})

describe('Spesen', () => {
  const liste = [
    s({ betrag_rappen: 1000 }),
    s({ betrag_rappen: 2000, person_id: 'p2', person: 'Marco Muster' }),
    s({ betrag_rappen: 500, status: 'ausbezahlt', ausbezahlt_am: '2026-10-21' }),
    s({ betrag_rappen: 700, status: 'storniert' }),
  ]

  it('filtert offen, ausbezahlt, storniert', () => {
    expect(filtern(liste, 'offen')).toHaveLength(2)
    expect(filtern(liste, 'ausbezahlt')).toHaveLength(1)
    expect(filtern(liste, 'storniert')).toHaveLength(1)
    expect(filtern(liste, 'alle')).toHaveLength(4)
  })

  it('rechnet offen je Person ohne Ausbezahltes und Storniertes', () => {
    expect(offenJePerson(liste)).toEqual([
      { person_id: 'p2', person: 'Marco Muster', rappen: 2000, anzahl: 1 },
      { person_id: 'p1', person: 'Lea Exemple', rappen: 1000, anzahl: 1 },
    ])
    expect(summe(liste)).toBe(4200)
  })

  it('schreibt CSV mit Strichpunkt und BOM und maskiert Anführungszeichen', () => {
    const csv = spesenCsv([s({ zweck: 'Essen; "Team"' })], 'de', { kategorie: (k) => k, status: (x) => x })
    expect(csv.startsWith('\uFEFFDatum;')).toBe(true)
    expect(csv.split('\r\n')[1]).toBe('20.10.2026;Lea Exemple;Parkieren;"Essen; ""Team""";12.50;eingereicht;;')
  })

  it('listet Spesen für die Mail mit Total', () => {
    const text = mailZeilen([s({}), s({ betrag_rappen: 750 })], (k) => k)
    expect(text).toContain('20.10.2026 · Parkieren · Kundentermin')
    expect(text).toMatch(/Total CHF 20\.00$/)
  })
})
