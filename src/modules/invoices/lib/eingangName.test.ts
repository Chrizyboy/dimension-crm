import { describe, expect, it } from 'vitest'
import { ablageJahr, abgrenzung, eingangDateiname } from './eingangName'

describe('Eingangsrechnung: Name und Periode', () => {
  it('benennt wie das Beispiel in Compta', () => {
    expect(eingangDateiname('2026-11-06', 'Strassenverkehrsamt Kanton Aargau', '2026-1511295', 'KIA EV9')).toBe(
      '20261106_Strassenverkehrsamt Kanton Aargau_2026-1511295_KIA EV9.pdf',
    )
  })
  it('ersetzt verbotene Zeichen und lässt leere Teile weg', () => {
    expect(eingangDateiname('2026-01-28', 'Kameleo', 'No 2026/000090', '')).toBe('20260128_Kameleo_No 2026-000090.pdf')
  })
  it('legt nach der Leistungsperiode ab', () => {
    expect(ablageJahr('2026-11-06', '2027-01-01', '2026-11-27')).toBe(2027)
    expect(ablageJahr('2026-11-06', '', '2026-11-27')).toBe(2026)
  })
  it('zeigt die Abgrenzung je Jahr', () => {
    expect(abgrenzung('2026-11-06', '2027-01-01', '2027-12-31', 41900)).toEqual({
      noetig: true,
      buchungsjahr: 2026,
      jahre: [{ jahr: 2027, tage: 365, rappen: 41900 }],
    })
    const a = abgrenzung('2026-06-10', '2026-07-01', '2027-06-30', 120000)
    expect(a?.jahre).toEqual([
      { jahr: 2026, tage: 184, rappen: 60493 },
      { jahr: 2027, tage: 181, rappen: 59507 },
    ])
    expect(abgrenzung('2026-03-01', '2026-03-01', '2026-03-31', 5000)?.noetig).toBe(false)
  })
})
