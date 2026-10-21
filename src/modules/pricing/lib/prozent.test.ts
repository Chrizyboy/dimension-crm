import { describe, expect, it } from 'vitest'
import { leseProzent, prozentText } from './prozent'

describe('Prozent', () => {
  it('zeigt Anteile als Prozent', () => {
    expect(prozentText(0.25)).toBe('25')
    expect(prozentText(0.015)).toBe('1.5')
    expect(prozentText(null)).toBe('')
  })
  it('liest Eingaben mit Komma und Prozentzeichen', () => {
    expect(leseProzent('1,5 %')).toBe(0.015)
    expect(leseProzent('25')).toBe(0.25)
    expect(leseProzent('')).toBeNull()
    expect(leseProzent('abc')).toBeNull()
  })
})
