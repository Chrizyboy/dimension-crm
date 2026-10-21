import { describe, expect, it } from 'vitest'
import type { Geschaeft } from '../types'
import { excelDatum, findeBestehend, lesePlanungstool, trenneName } from './planungstool'

const blatt = {
  sheet: 'Leads',
  data: [
    ['Planungstool', null, null],
    ['Name', 'Lead-ID', 'PLZ', 'Ort', 'Telefonnummer', 'Eingegangen'],
    ['Muster Anna', 'L012', 5630, 'Muri AG', '079 123 45 67', 46316],
    ['Neu Hans', 'SG-9', '1630.0', 'Bulle', '', '21.10.2026'],
    [null, null, null],
  ],
}

describe('Planungstool-Excel', () => {
  it('findet die Kopfzeile und liest die Leads', () => {
    const l = lesePlanungstool([blatt])
    expect(l).toHaveLength(2)
    expect(l?.[0]?.plz).toBe('5630')
    expect(l?.[1]?.plz).toBe('1630')
    expect(l?.[1]?.eingang).toBe('2026-10-21')
  })
  it('meldet ein falsches Excel', () => {
    expect(lesePlanungstool([{ sheet: 'x', data: [['a', 'b']] }])).toBeNull()
  })
  it('wandelt Excel-Daten', () => {
    expect(excelDatum(46316)).toBe('2026-10-21')
  })
  it('erkennt bestehende Leads an Nummer oder Telefon', () => {
    const l = lesePlanungstool([blatt]) ?? []
    const g = {
      nummer: 'L999',
      telefonZiffern: '0791234567',
      email: null,
      name: 'x',
      plz: null,
    } as unknown as Geschaeft
    expect(findeBestehend(l[0] as never, [g])).toBe(g)
    expect(findeBestehend(l[1] as never, [g])).toBeNull()
  })
  it('trennt Nachname und Vorname', () => {
    expect(trenneName('Muster Anna Maria')).toEqual({ nachname: 'Muster', vorname: 'Anna Maria' })
  })
})
