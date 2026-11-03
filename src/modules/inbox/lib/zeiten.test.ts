import { describe, expect, it } from 'vitest'
import { zurueckZeiten } from './zeiten'

describe('zurueckZeiten', () => {
  it('bietet am Montagmorgen Nachmittag, morgen, nächsten Montag und eine Woche', () => {
    const z = zurueckZeiten(new Date(2026, 10, 2, 9, 0))
    expect(z.map((x) => x.wahl)).toEqual(['nachmittag', 'morgen', 'montag', 'woche'])
    expect(z[1]?.bis).toEqual(new Date(2026, 10, 3, 7, 30))
    expect(z[2]?.bis).toEqual(new Date(2026, 10, 9, 7, 30))
  })

  it('überspringt am Freitagnachmittag den Nachmittag und doppelte Montage', () => {
    const z = zurueckZeiten(new Date(2026, 10, 6, 15, 0))
    expect(z.map((x) => x.wahl)).toEqual(['morgen', 'woche'])
    expect(z[0]?.bis).toEqual(new Date(2026, 10, 9, 7, 30))
  })
})
