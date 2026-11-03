import { describe, expect, it } from 'vitest'
import { abweichung, pruefpunkteFuer, zahl } from './inspektion'

const e = {
  pakete: [
    { id: 'comfort', messung: false },
    { id: 'premium', messung: true },
  ],
  pruefpunkte: [
    { schluessel: 'sicht', de: 'Sicht', fr: 'Visuel', art: 'ja_nein' as const },
    { schluessel: 'isolation', de: 'Isolation', fr: 'Isolement', art: 'wert' as const, nur_messung: true },
  ],
}

describe('pruefpunkteFuer', () => {
  it('Messungen nur mit Paket «messung»', () => {
    expect(pruefpunkteFuer(e, 'comfort').map((p) => p.schluessel)).toEqual(['sicht'])
    expect(pruefpunkteFuer(e, 'premium').map((p) => p.schluessel)).toEqual(['sicht', 'isolation'])
  })
  it('alter Vertrag ohne Paket: alle Punkte', () => {
    expect(pruefpunkteFuer(e, null)).toHaveLength(2)
  })
})

describe('abweichung', () => {
  it('liest Schweizer Zahlen', () => {
    expect(zahl("1'250,5")).toBe(1250.5)
    expect(zahl('')).toBeNull()
    expect(zahl(true)).toBeNull()
  })
  it('meldet nur über der Schwelle', () => {
    expect(abweichung('9000', '10000', 10)).toBeNull()
    expect(abweichung('8500', '10000', 10)).toBe(-15)
    expect(abweichung('620', '500', 10)).toBe(24)
  })
  it('ohne Vorjahr kein Vergleich', () => {
    expect(abweichung('5', null, 10)).toBeNull()
    expect(abweichung('5', '0', 10)).toBeNull()
  })
})
