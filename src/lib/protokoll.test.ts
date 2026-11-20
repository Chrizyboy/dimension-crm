import { describe, expect, it } from 'vitest'
import { datensatzText, geaenderteFelder, wertText } from './protokoll'

describe('geaenderteFelder', () => {
  it('zeigt nur geänderte, fachliche Felder', () => {
    expect(
      geaenderteFelder(
        { name: 'Muri', plz: '5630', geaendert_am: '1' },
        { name: 'Muri AG', plz: '5630', geaendert_am: '2' },
      ),
    ).toEqual([{ feld: 'name', vorher: 'Muri', nachher: 'Muri AG' }])
  })
  it('zeigt beim Anlegen die gefüllten Felder', () => {
    expect(geaenderteFelder(null, { name: 'Neu', notiz: null })).toEqual([
      { feld: 'name', vorher: '–', nachher: 'Neu' },
    ])
  })
})

describe('wertText', () => {
  it('kürzt lange Werte', () => {
    expect(wertText('x'.repeat(100))).toHaveLength(80)
    expect(wertText([1, 2])).toBe('[1,2]')
  })
})

describe('datensatzText', () => {
  it('nimmt Nummer und Name', () => {
    expect(datensatzText({ nummer: 'R-12', name: 'Muster AG' })).toBe('R-12 · Muster AG')
    expect(datensatzText({ vorname: 'Léa', nachname: 'Exemple' })).toBe('Léa Exemple')
  })
})
