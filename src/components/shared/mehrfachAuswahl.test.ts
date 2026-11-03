import { beschriftungMehrfach, schalteWert } from './mehrfachAuswahl'

const alle = ['fil', 'lor', 'dav', 'chr']
const optionen = [
  { wert: 'fil', text: 'Filipe' },
  { wert: 'lor', text: 'Loris' },
  { wert: 'dav', text: 'Davis' },
  { wert: 'chr', text: 'Chris' },
]
const ausser = (t: string) => `Alle ausser ${t}`

describe('schalteWert', () => {
  it('nimmt bei «alle» einen Wert weg: alle ausser diesem', () => {
    expect(schalteWert(alle, [], 'dav')).toEqual(['fil', 'lor', 'chr'])
  })
  it('fügt hinzu und hält die Reihenfolge der Liste', () => {
    expect(schalteWert(alle, ['lor'], 'fil')).toEqual(['fil', 'lor'])
  })
  it('wird wieder «alle», wenn alle angehakt sind', () => {
    expect(schalteWert(alle, ['fil', 'lor', 'chr'], 'dav')).toEqual([])
  })
  it('lässt das letzte Häkchen stehen', () => {
    expect(schalteWert(alle, ['lor'], 'lor')).toEqual(['lor'])
  })
})

describe('beschriftungMehrfach', () => {
  it('zeigt «alle», einen, zwei, «alle ausser» und «+n»', () => {
    expect(beschriftungMehrfach(optionen, [], 'Alle Personen', ausser)).toBe('Alle Personen')
    expect(beschriftungMehrfach(optionen, ['lor'], 'Alle Personen', ausser)).toBe('Loris')
    expect(beschriftungMehrfach(optionen, ['fil', 'lor'], 'Alle Personen', ausser)).toBe('Filipe, Loris')
    expect(beschriftungMehrfach(optionen, ['fil', 'lor', 'chr'], 'Alle Personen', ausser)).toBe('Alle ausser Davis')
    const fuenf = [...optionen, { wert: 'jos', text: 'José' }]
    expect(beschriftungMehrfach(fuenf, ['fil', 'lor', 'chr'], 'Alle', ausser)).toBe('Filipe +2')
  })
})
