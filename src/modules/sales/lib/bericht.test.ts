import { expect, it } from 'vitest'
import { berichtBetreff, berichtFakten, berichtText, monatName } from './bericht'

const stand = { inBearbeitung: 8, termin: 0, offeriert: 10, keinInteresse: 2 }
const ohne = [
  { id: 'a', eingang_am: '2026-09-09', name: 'Anna Test', plz: '5077', ort: 'Elfingen', grund: null },
  { id: 'b', eingang_am: '2026-09-13', name: 'Beat Test', plz: '5705', ort: 'Hallwil', grund: 'Hat schon eine Anlage' },
]

it('schreibt Monat und Betreff in beiden Sprachen', () => {
  expect(monatName('2026-09', 'de')).toBe('September 2026')
  expect(monatName('2026-03', 'fr')).toBe('mars 2026')
  expect(berichtBetreff('2026-09', 'de')).toBe('Lead-Auswertung September 2026 – Dimension Solaire')
})

it('meldet fehlende Leads und trennt reklamierte von den übrigen wie V233', () => {
  const text = berichtText({
    monat: '2026-09',
    quelle: 'solar-guide.ch',
    erhalten: 19,
    gekauft: 20,
    stand,
    ohneInteresse: ohne,
    reklamiert: new Set(['a']),
    sprache: 'de',
  })
  expect(text).toContain('Erhaltene Leads im CRM: 19')
  expect(text).toContain('Differenz: es fehlen 1 Lead. Bitte prüfen und nachliefern bzw. gutschreiben.')
  expect(text).toContain('– Offeriert: 10')
  expect(text).toContain(
    'Wir bitten um Prüfung und Gutschrift folgender Leads:\n– 09.09.2026 · Anna Test · 5077 Elfingen · Grund: nicht erfasst',
  )
  expect(text).toContain('Weitere Leads ohne Interesse (zur Information):\n– 13.09.2026 · Beat Test')
})

it('sagt, wenn die Anzahl stimmt, und schreibt Französisch', () => {
  const text = berichtText({
    monat: '2026-09',
    quelle: 'X',
    erhalten: 5,
    gekauft: 5,
    stand,
    ohneInteresse: [],
    reklamiert: new Set(),
    sprache: 'fr',
  })
  expect(text).toContain('Différence : aucune')
  expect(text.startsWith('Bonjour')).toBe(true)
})

it('Fakten für den KI-Text: Differenz, Reklamation und zur Info getrennt', () => {
  const l = (id: string) => ({
    id,
    eingang_am: '2026-09-03',
    name: `Test ${id}`,
    plz: '1630',
    ort: 'Bulle',
    grund: null,
  })
  const f = berichtFakten({
    monat: '2026-09',
    erhalten: 10,
    gekauft: 12,
    stand: { inBearbeitung: 3, termin: 2, offeriert: 1, keinInteresse: 4 },
    ohneInteresse: [l('a'), l('b')],
    reklamiert: new Set(['a']),
  })
  expect(f.differenz).toBe(-2)
  expect(f.reklamation).toEqual([{ datum: '03.09.2026', name: 'Test a', ort: '1630 Bulle', grund: 'nicht erfasst' }])
  expect((f.zur_info as unknown[]).length).toBe(1)
})
