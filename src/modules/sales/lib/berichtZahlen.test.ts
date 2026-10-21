import { expect, it } from 'vitest'
import type { BerichtQuelle } from '../services/bericht'
import { abgleich, gruende, kennzahlen } from './berichtZahlen'

const quelle = (q: Partial<BerichtQuelle>): BerichtQuelle =>
  ({
    quelle: 'x',
    erhalten: 0,
    inBearbeitung: 0,
    termin: 0,
    offeriert: 0,
    keinInteresse: 0,
    leads: [],
    gekauft: null,
    ...q,
  }) as BerichtQuelle

it('vergleicht erhalten und gekauft nur, wenn gekauft eingetragen ist', () => {
  expect(abgleich({ erhalten: 19, gekauft: 20 })).toBe(-1)
  expect(abgleich({ erhalten: 5, gekauft: null })).toBeNull()
})

it('zählt Gründe und rechnet die Kennzahlen ohne eigene Leads beim Abgleich', () => {
  const sg = quelle({
    quelle: 'solar_guide',
    erhalten: 19,
    gekauft: 20,
    termin: 2,
    offeriert: 3,
    keinInteresse: 2,
    leads: [{ id: '1', stand: 'kein', grund: null } as never, { id: '2', stand: 'kein', grund: null } as never],
  })
  const eigen = quelle({ quelle: 'direktkontakt', erhalten: 1, gekauft: 5 })
  expect(gruende(sg, 'nicht erfasst')).toEqual([['nicht erfasst', 2]])
  const k = kennzahlen([sg, eigen], (q) => q === 'solar_guide')
  expect(k).toMatchObject({ leads: 20, eigene: 1, gekauft: 20, fehlen: 1, terminOfferte: 5, terminAnteil: 25 })
})
