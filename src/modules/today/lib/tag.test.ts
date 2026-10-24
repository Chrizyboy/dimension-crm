import { describe, expect, it } from 'vitest'
import type { MeinTag, TagListe } from '../types'
import { anzahlOffen, tagesMailText, tageszeit, vorname, zeileAlsText } from './tag'

const leer: TagListe = { anzahl: 0, zeilen: [] }
const tag: MeinTag = {
  heute: '2026-10-26',
  person: { id: 'p', name: 'Vera Verkauf' },
  termine: {
    anzahl: 1,
    zeilen: [{ art: 'besichtigung', datum: '2026-10-26', zeit: '10:00', titel: 'Tina Probe', unter: 'Bulle' }],
  },
  aufgaben: leer,
  vergeben: { anzahl: 2, zeilen: [] },
  nachfassen: {
    anzahl: 12,
    zeilen: Array.from({ length: 12 }, (_, i) => ({
      art: 'nachfassen' as const,
      titel: `K${i}`,
      betrag_rappen: 1_250_000,
    })),
  },
  neue_leads: leer,
  wiedervorlagen: leer,
  fristen: leer,
  zahlungen: leer,
  service: leer,
  kontrollen: leer,
}

describe('Mein Tag', () => {
  it('begrüsst nach Schweizer Zeit', () => {
    expect(tageszeit(new Date('2026-10-26T07:30:00Z'))).toBe('morgen')
    expect(tageszeit(new Date('2026-10-26T12:00:00Z'))).toBe('tag')
    expect(tageszeit(new Date('2026-10-26T17:30:00Z'))).toBe('abend')
  })

  it('nimmt den Vornamen', () => {
    expect(vorname('Vera Verkauf')).toBe('Vera')
    expect(vorname(null)).toBe('')
  })

  it('zählt ohne «von mir vergeben»', () => {
    expect(anzahlOffen(tag)).toBe(13)
  })

  it('schreibt eine Zeile mit Datum, Zeit und Betrag', () => {
    expect(zeileAlsText({ art: 'zahlung', datum: '2026-10-27', titel: 'A', betrag_rappen: 900_000 })).toBe(
      "27.10.2026 · A · CHF 9'000.00",
    )
  })

  it('baut die Mail nur aus Listen mit Einträgen und kürzt auf 10', () => {
    const text = tagesMailText(tag, (l) => l.toUpperCase(), 'Übersicht')
    expect(text).toContain('TERMINE (1)')
    expect(text).toContain('26.10.2026 10:00 · Tina Probe · Bulle')
    expect(text).toContain('NACHFASSEN (12)')
    expect(text).toContain('- … +2')
    expect(text).not.toContain('AUFGABEN')
  })
})
