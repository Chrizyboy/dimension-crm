import { describe, expect, it } from 'vitest'
import { kurzzeichenBereinigt, kurzzeichenVon, kurzzeichenVorschlag } from './kurzzeichen'

describe('kurzzeichenVorschlag', () => {
  it('nimmt Vor- und Nachname', () => {
    expect(kurzzeichenVorschlag('Chris Rosenberg')).toBe('CR')
    expect(kurzzeichenVorschlag('Diogo Dos Santos')).toBe('DS')
  })
  it('nimmt bei einem Wort zwei Buchstaben', () => {
    expect(kurzzeichenVorschlag('Loris')).toBe('LO')
  })
  it('weicht bei Besetzung aus', () => {
    expect(kurzzeichenVorschlag('Diogo Semedo', ['DS'])).toBe('DSE')
    expect(kurzzeichenVorschlag('Dora Sauer', ['DS', 'DSA'])).toBe('DOS')
    expect(kurzzeichenVorschlag('Dora Sa', ['DS', 'DSA', 'DOS'])).toBe('DS2')
  })
  it('gibt leer ohne Namen', () => {
    expect(kurzzeichenVorschlag('  ')).toBe('')
  })
})

describe('kurzzeichenBereinigt', () => {
  it('macht gross, ohne Leerzeichen, höchstens vier Zeichen', () => {
    expect(kurzzeichenBereinigt(' l p ')).toBe('LP')
    expect(kurzzeichenBereinigt('abcdef')).toBe('ABCD')
  })
})

describe('kurzzeichenVon', () => {
  it('nimmt das gespeicherte Kurzzeichen, sonst die Initialen', () => {
    expect(kurzzeichenVon({ name: 'Loris P', kurzzeichen: 'LP' })).toBe('LP')
    expect(kurzzeichenVon({ name: 'Chris Rosenberg', kurzzeichen: null })).toBe('CR')
  })
})
