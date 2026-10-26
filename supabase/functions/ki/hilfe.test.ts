// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { anonymisiere, bezugFeld, dateiFeld, spracheFeld, tagesbeginn } from './hilfe.ts'

describe('anonymisiere', () => {
  it('entfernt Name, Strasse, E-Mail und Telefon aus Stil-Beispielen', () => {
    const t = anonymisiere('Guten Tag Frau Beispiel, Ihre Anlage an der Musterweg 3 … mail: x@y.ch, 076 123 45 67', {
      kunde: { vorname: 'Lea', nachname: 'Beispiel' },
      objekte: [{ strasse: 'Musterweg 3' }],
    })
    expect(t).not.toContain('Beispiel')
    expect(t).not.toContain('Musterweg')
    expect(t).toContain('[E-Mail]')
    expect(t).toContain('[Telefon]')
  })
})

describe('Eingaben', () => {
  it('Bezug nur für erlaubte Tabellen, ohne Angabe keiner', () => {
    expect(bezugFeld({ tabelle: 'kontakte', id: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })).toEqual({
      tabelle: 'kontakte',
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    })
    expect(bezugFeld({})).toBeNull()
    expect(() => bezugFeld({ tabelle: 'personen', id: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })).toThrow()
  })
  it('Sprache de/fr, sonst Rückfall', () => {
    expect(spracheFeld({ sprache: 'fr' })).toBe('fr')
    expect(spracheFeld({ sprache: 'it' }, 'de')).toBe('de')
  })
  it('Datei: nur Bilder und PDF', () => {
    expect(dateiFeld({ datei: { typ: 'application/pdf', base64: 'AA' } }).art).toBe('pdf')
    expect(() => dateiFeld({ datei: { typ: 'text/html', base64: 'AA' } })).toThrow()
  })
})

describe('tagesbeginn', () => {
  it('Schweizer Mitternacht in UTC, auch am Tag der Zeitumstellung', () => {
    expect(tagesbeginn('2026-07-01')).toBe('2026-06-30T22:00:00.000Z')
    expect(tagesbeginn('2026-10-25')).toBe('2026-10-24T22:00:00.000Z')
    expect(tagesbeginn('2026-10-26')).toBe('2026-10-25T23:00:00.000Z')
  })
})
