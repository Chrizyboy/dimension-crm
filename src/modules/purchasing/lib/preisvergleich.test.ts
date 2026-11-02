import { describe, expect, it } from 'vitest'
import { guenstiger } from './preisvergleich'

const preise = [
  { artikel_id: 'a', lieferant_id: 'k', lieferant: 'Krannich', ek_rappen: 12000 },
  { artikel_id: 'a', lieferant_id: 't', lieferant: 'Tritec', ek_rappen: 11000 },
]

describe('guenstiger', () => {
  it('zeigt den günstigeren anderen Lieferanten', () => {
    expect(guenstiger('a', 'k', 12000, preise)).toEqual({ lieferant: 'Tritec', ek_rappen: 11000, ersparnis: 1000 })
  })
  it('nichts, wenn man schon beim günstigsten ist oder kein Preis', () => {
    expect(guenstiger('a', 't', 11000, preise)).toBeNull()
    expect(guenstiger('a', 'k', null, preise)).toBeNull()
    expect(guenstiger(null, 'k', 12000, preise)).toBeNull()
  })
})
