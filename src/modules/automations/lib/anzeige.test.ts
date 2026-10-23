import { describe, expect, it } from 'vitest'
import { gehtNachAussen, neueAktion, unbekanntePlatzhalter, wartetageTotal, wertLesen, wertText } from './anzeige'

describe('wertLesen', () => {
  it('liest Zahlen, Wahrheitswerte und Text', () => {
    expect(wertLesen('14', '>=')).toBe(14)
    expect(wertLesen('ja', '=')).toBe(true)
    expect(wertLesen('non', '=')).toBe(false)
    expect(wertLesen(' FR ', '=')).toBe('FR')
  })
  it('liest Listen bei «in» und nichts bei «leer»', () => {
    expect(wertLesen('offen, teilweise, 3', 'in')).toEqual(['offen', 'teilweise', 3])
    expect(wertLesen('x', 'leer')).toBeUndefined()
  })
  it('ist das Gegenstück zu wertText', () => {
    expect(wertText(['offen', 'teilweise'])).toBe('offen, teilweise')
    expect(wertText(undefined)).toBe('')
    expect(wertLesen(wertText(['a', 'b']), 'in')).toEqual(['a', 'b'])
  })
})

describe('Aktionen', () => {
  it('neue Aufgabe hat Empfänger, Texte und Frist', () => {
    expect(neueAktion('aufgabe')).toMatchObject({ art: 'aufgabe', an: ['zustaendig', 'rolle:admin'], faellig_tage: 1 })
    expect(neueAktion('zuteilen')).toEqual({ art: 'zuteilen' })
  })
  it('erkennt Aktionen nach aussen', () => {
    expect(gehtNachAussen({ aktionen: [{ art: 'aufgabe' }, { art: 'sms' }] }, undefined)).toBe(true)
    expect(gehtNachAussen({ aktionen: [{ art: 'aufgabe' }] }, undefined)).toBe(false)
  })
  it('zählt Wartezeiten zusammen', () => {
    expect(wartetageTotal([{ art: 'warten', tage: 30 }, { art: 'aufgabe' }, { art: 'warten', tage: 14 }])).toBe(44)
  })
})

describe('unbekanntePlatzhalter', () => {
  it('findet Tippfehler, kennt gültige', () => {
    expect(unbekanntePlatzhalter('Grüezi {Anrede} {Vornam} {Name} {Vornam}', ['Anrede', 'Name'])).toEqual(['Vornam'])
  })
})
