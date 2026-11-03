import { describe, expect, it } from 'vitest'
import { inventurAbweichungen, ruestVorschlag } from './lagerTypen'

describe('inventurAbweichungen', () => {
  const zeilen = [
    { artikel_id: 'a', menge: 10 },
    { artikel_id: 'b', menge: 4 },
    { artikel_id: 'c', menge: 0 },
  ]
  it('nimmt nur gezählte Artikel mit Abweichung', () => {
    expect(inventurAbweichungen(zeilen, { a: 10, b: 3, c: null })).toEqual([
      { artikel_id: 'b', menge: 3, differenz: -1 },
    ])
  })
  it('findet auch Ware, die im Lager auf null stand', () => {
    expect(inventurAbweichungen(zeilen, { c: 2 })).toEqual([{ artikel_id: 'c', menge: 2, differenz: 2 }])
  })
})

describe('ruestVorschlag', () => {
  it('schlägt das Offene vor, höchstens reserviert + frei', () => {
    expect(ruestVorschlag({ offen: 10, reserviert: 6, frei: 2 })).toBe(8)
    expect(ruestVorschlag({ offen: 3, reserviert: 6, frei: 2 })).toBe(3)
    expect(ruestVorschlag({ offen: 5, reserviert: 0, frei: 0 })).toBe(0)
  })
})
