import { describe, expect, it } from 'vitest'
import { neuerSchluessel, verschiebe } from './auswahllisten'

describe('neuerSchluessel', () => {
  it('macht aus dem Text einen Schlüssel ohne Umlaute', () => {
    expect(neuerSchluessel('Messe Bulle 2026', [])).toBe('messe_bulle_2026')
    expect(neuerSchluessel('Gebäude öffentlich', [])).toBe('gebaeude_oeffentlich')
    expect(neuerSchluessel('Façade', [])).toBe('facade')
  })
  it('weicht bei Doppelten aus', () => {
    expect(neuerSchluessel('Messe', ['messe', 'messe_2'])).toBe('messe_3')
  })
})

describe('verschiebe', () => {
  it('tauscht und nummeriert neu', () => {
    const l = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(verschiebe(l, 'c', -1).map((x) => `${x.id}${x.reihenfolge}`)).toEqual(['a10', 'c20', 'b30'])
    expect(verschiebe(l, 'a', -1).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})
