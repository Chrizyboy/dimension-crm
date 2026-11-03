import { expect, it } from 'vitest'
import { PIPELINE_SPALTEN, verteile, zielInSpalte } from './spalten'
import { testGeschaeft } from './testgeschaeft'

it('zeigt sechs Schritte und blendet Abgeschlossenes aus, bis man es einschaltet', () => {
  const g = [
    testGeschaeft({ id: 'a', stand: 'verbaut' }),
    testGeschaeft({ id: 'b', stand: 'lead_neu' }),
    testGeschaeft({ id: 'c', stand: 'kein' }),
  ]
  const ohne = verteile(g, false)
  expect(ohne.map((s) => s.spalte.id)).toEqual(['neu', 'kontaktiert', 'termin', 'offerte', 'entscheid', 'gewonnen'])
  expect(ohne.find((s) => s.spalte.id === 'gewonnen')?.karten).toEqual([])
  const mit = verteile(g, true)
  expect(mit.find((s) => s.spalte.id === 'gewonnen')?.karten.map((k) => k.id)).toEqual(['a'])
  expect(mit.find((s) => s.spalte.id === 'aus')?.karten.map((k) => k.id)).toEqual(['c'])
})

it('legt mehrere Stände in eine Spalte, neueste Bewegung oben', () => {
  const g = [
    testGeschaeft({ id: 'alt', stand: 'offeriert', standDatum: '2026-09-01' }),
    testGeschaeft({ id: 'neu', stand: 'nachfassen', standDatum: '2026-10-01' }),
  ]
  expect(
    verteile(g, false)
      .find((s) => s.spalte.id === 'entscheid')
      ?.karten.map((k) => k.id),
  ).toEqual(['neu', 'alt'])
})

it('macht aus «verloren» ohne Offerte «kein Interesse»', () => {
  const verloren = PIPELINE_SPALTEN.find((s) => s.id === 'aus')
  if (!verloren) throw new Error('Spalte fehlt')
  expect(zielInSpalte(verloren, { offerteId: null })).toBe('kein')
  expect(zielInSpalte(verloren, { offerteId: 'o1' })).toBe('verloren')
})

it('zeigt nur die gewählten Spalten in fester Reihenfolge, alte Namen zählen nicht', () => {
  const g = [testGeschaeft({ id: 'b', stand: 'lead_neu' })]
  expect(verteile(g, false, ['termin', 'neu']).map((s) => s.spalte.id)).toEqual(['neu', 'termin'])
  expect(verteile(g, true, ['termin']).map((s) => s.spalte.id)).toEqual(['termin', 'aus'])
  expect(verteile(g, false, ['offen', 'spaeter'])).toHaveLength(6)
})
