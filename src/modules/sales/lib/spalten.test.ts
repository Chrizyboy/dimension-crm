import { expect, it } from 'vitest'
import { PIPELINE_SPALTEN, verteile, zielInSpalte } from './spalten'
import { testGeschaeft } from './testgeschaeft'

it('blendet abgeschlossene Spalten aus, bis man sie einschaltet', () => {
  const g = [testGeschaeft({ id: 'a', stand: 'verbaut' }), testGeschaeft({ id: 'b', stand: 'lead_neu' })]
  expect(verteile(g, false).map((s) => s.spalte.id)).not.toContain('gewonnen')
  const mit = verteile(g, true)
  expect(mit.find((s) => s.spalte.id === 'gewonnen')?.karten.map((k) => k.id)).toEqual(['a'])
})

it('legt mehrere Stände in eine Spalte, neueste Bewegung oben', () => {
  const g = [
    testGeschaeft({ id: 'alt', stand: 'offeriert', standDatum: '2026-09-01' }),
    testGeschaeft({ id: 'neu', stand: 'nachfassen', standDatum: '2026-10-01' }),
  ]
  expect(
    verteile(g, false)
      .find((s) => s.spalte.id === 'offeriert')
      ?.karten.map((k) => k.id),
  ).toEqual(['neu', 'alt'])
})

it('macht aus «verloren» ohne Offerte «kein Interesse»', () => {
  const verloren = PIPELINE_SPALTEN.find((s) => s.id === 'verloren')
  if (!verloren) throw new Error('Spalte fehlt')
  expect(zielInSpalte(verloren, { offerteId: null })).toBe('kein')
  expect(zielInSpalte(verloren, { offerteId: 'o1' })).toBe('verloren')
})
