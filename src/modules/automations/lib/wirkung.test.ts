import { describe, expect, it } from 'vitest'
import { dauerText, wirkungSumme } from './wirkung'

describe('wirkungSumme', () => {
  it('zählt nur Arten mit Minuten', () => {
    expect(wirkungSumme({ aufgabe: 10, mail: 5, keine_dublette: 3 }, { aufgabe: 5, mail: 6 })).toEqual({
      schritte: 15,
      minuten: 80,
    })
  })
})

describe('dauerText', () => {
  it('schreibt Stunden und Minuten', () => {
    expect(dauerText(45)).toBe('45 min')
    expect(dauerText(120)).toBe('2 h')
    expect(dauerText(230)).toBe('3 h 50 min')
  })
})
