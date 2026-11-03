import { describe, expect, it } from 'vitest'
import type { MeinTag, TagListe } from '../types'
import {
  anzahlOffen,
  naechsterMontag,
  plusTage,
  tagesMailText,
  tageszeit,
  verschiebbar,
  vorname,
  wetterArt,
  warum,
  zeileAlsText,
  zielProzent,
} from './tag'

const leer: TagListe = { anzahl: 0, zeilen: [] }
const tag: MeinTag = {
  heute: '2026-10-26',
  person: { id: 'p', name: 'Vera Verkauf' },
  darf_ziele: false,
  ziele: null,
  termine: {
    anzahl: 1,
    zeilen: [{ art: 'besichtigung', datum: '2026-10-26', zeit: '10:00', titel: 'Tina Probe', unter: 'Bulle' }],
  },
  aufgaben: leer,
  vergeben: { anzahl: 2, zeilen: [] },
  freigaben: {
    anzahl: 1,
    zeilen: [{ art: 'freigabe', datum: '2026-10-24', titel: 'Ihre Offerte', unter: 'tina@beispiel.test' }],
  },
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
    expect(anzahlOffen(tag)).toBe(14)
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

describe('Verschieben und Gründe (Ausbau 2.11.2026)', () => {
  it('rechnet Tage und den nächsten Montag', () => {
    expect(plusTage('2026-12-31', 1)).toBe('2027-01-01')
    expect(naechsterMontag('2026-11-02')).toBe('2026-11-09') // Montag → nächster Montag
    expect(naechsterMontag('2026-11-06')).toBe('2026-11-09') // Freitag
    expect(naechsterMontag('2026-11-08')).toBe('2026-11-09') // Sonntag
  })

  it('verschiebt keine Termine und Freigaben', () => {
    expect(verschiebbar({ art: 'besichtigung', titel: 'x', id: '1' })).toBe(false)
    expect(verschiebbar({ art: 'freigabe', titel: 'x', id: '1' })).toBe(false)
    expect(verschiebbar({ art: 'nachfassen', titel: 'x', id: '1' })).toBe(true)
    expect(verschiebbar({ art: 'aufgabe', titel: 'x', id: '1' })).toBe(false)
    expect(verschiebbar({ art: 'aufgabe', titel: 'x', aufgabe_id: 'a' })).toBe(true)
  })

  it('sagt, warum eine Zeile dasteht', () => {
    expect(warum({ art: 'nachfassen', titel: 'x', tage: 14 })).toEqual({
      schluessel: 'tag.warum.nachfassen',
      werte: { count: 14 },
    })
    expect(warum({ art: 'aufgabe', titel: 'x', von: 'Andreas Muster' })?.werte).toEqual({ name: 'Andreas' })
    expect(warum({ art: 'frist', titel: 'x' })).toBeNull()
  })

  it('begrenzt den Fortschritt auf 0 bis 100 Prozent', () => {
    expect(zielProzent(3, 4)).toBe(75)
    expect(zielProzent(9, 4)).toBe(100)
    expect(zielProzent(1, 0)).toBe(0)
  })
})

describe('Wetter auf der Baustelle', () => {
  it('leitet die Wetterart aus den Werten ab', () => {
    expect(wetterArt({})).toBe('unbekannt')
    expect(wetterArt({ tmax: 12, regen_mm: 6 })).toBe('regen')
    expect(wetterArt({ tmax: 0, regen_mm: 3 })).toBe('schnee')
    expect(wetterArt({ tmax: 18, regen_mm: 0, regen_prozent: 10 })).toBe('sonne')
    expect(wetterArt({ tmax: 18, regen_mm: 0.4, regen_prozent: 50 })).toBe('wolken')
  })
})
