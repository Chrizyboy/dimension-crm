import { expect, it } from 'vitest'
import { berichtText, monatName } from './bericht'

it('schreibt den Monat in beiden Sprachen', () => {
  expect(monatName('2026-09', 'de')).toBe('September 2026')
  expect(monatName('2026-03', 'fr')).toBe('mars 2026')
})

it('bittet um fehlende Leads und Ersatz für Leads ohne Interesse', () => {
  const text = berichtText({
    monat: '2026-09',
    quelle: 'solar-guide.ch',
    erhalten: 19,
    gekauft: 20,
    ohneInteresse: [{ eingang_am: '2026-09-09', name: 'Anna Test', ort: 'Elfingen', grund: null }],
    sprache: 'de',
  })
  expect(text).toContain('Erhaltene Leads im CRM: 19')
  expect(text).toContain('Es fehlt 1 Lead')
  expect(text).toContain('09.09.2026 · Anna Test · Elfingen · Grund: nicht erfasst')
  expect(text).toContain('diesen Lead ohne Interesse')
})

it('lässt die Differenz weg, wenn nichts fehlt, und schreibt Französisch', () => {
  const text = berichtText({ monat: '2026-09', quelle: 'X', erhalten: 5, gekauft: 5, ohneInteresse: [], sprache: 'fr' })
  expect(text).not.toContain('Différence')
  expect(text.startsWith('Bonjour')).toBe(true)
})
