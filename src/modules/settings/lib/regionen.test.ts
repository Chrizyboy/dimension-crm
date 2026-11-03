import { describe, expect, it } from 'vitest'
import { regelnLesen, regelnText } from './regionen'

describe('regelnLesen', () => {
  it('versteht Bereiche, einzelne PLZ und Kantone', () => {
    expect(regelnLesen('5600-5649, 6300; zg')).toEqual([
      { plz_von: 5600, plz_bis: 5649 },
      { plz_von: 6300, plz_bis: 6300 },
      { kantone: ['ZG'] },
    ])
  })
  it('lehnt Unverständliches und verkehrte Bereiche ab', () => {
    expect(regelnLesen('56')).toBeNull()
    expect(regelnLesen('5700-5600')).toBeNull()
  })
  it('leer ergibt keine Regeln', () => {
    expect(regelnLesen('  ')).toEqual([])
  })
})

describe('regelnText', () => {
  it('schreibt die Regeln zurück', () => {
    expect(regelnText([{ plz_von: 5600, plz_bis: 5649 }, { kantone: ['ZG'] }, { plz_von: 6300, plz_bis: 6300 }])).toBe(
      '5600-5649, ZG, 6300',
    )
    expect(regelnText(null)).toBe('')
  })
})
