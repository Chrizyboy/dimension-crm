import { describe, expect, it } from 'vitest'
import { kmAm, leasingJahrBeginn, leasingPrognose } from './leasing'

const f = {
  leasing_beginn: '2023-03-01',
  leasing_bis: '2027-02-28',
  leasing_km_jahr: 25000,
  leasing_mehr_km_rappen: 12,
  km_stand: 84200,
}

describe('leasingJahrBeginn', () => {
  it('nimmt den letzten Jahrestag', () => {
    expect(leasingJahrBeginn('2023-03-01', '2026-11-02')).toBe('2026-03-01')
    expect(leasingJahrBeginn('2023-12-15', '2026-11-02')).toBe('2025-12-15')
    expect(leasingJahrBeginn('2026-10-01', '2026-11-02')).toBe('2026-10-01')
  })
})

describe('kmAm', () => {
  it('letzter Stand davor, sonst erster danach', () => {
    const e = [
      { datum: '2026-01-10', km: 60000 },
      { datum: '2026-03-15', km: 66000 },
      { datum: '2026-02-01', km: null },
    ]
    expect(kmAm(e, '2026-03-01')).toBe(60000)
    expect(kmAm(e, '2025-12-01')).toBe(60000)
    expect(kmAm([], '2026-03-01')).toBeNull()
  })
})

describe('leasingPrognose', () => {
  it('rechnet aufs ganze Leasingjahr hoch und schätzt die Nachzahlung', () => {
    const p = leasingPrognose(f, [{ datum: '2026-03-01', km: 61350 }], '2026-11-02')
    expect(p?.gefahren).toBe(22850)
    expect(p?.prognose).toBeGreaterThan(33000)
    expect(p?.mehrKm).toBe((p?.prognose ?? 0) - 25000)
    expect(p?.mehrKostenRappen).toBe((p?.mehrKm ?? 0) * 12)
  })
  it('keine Prognose ohne Limite, kurz nach Beginn oder nach Leasing-Ende', () => {
    expect(leasingPrognose({ ...f, leasing_km_jahr: null }, [], '2026-11-02')).toBeNull()
    expect(leasingPrognose(f, [{ datum: '2026-03-01', km: 80000 }], '2026-03-20')).toBeNull()
    expect(leasingPrognose(f, [{ datum: '2026-03-01', km: 80000 }], '2027-03-20')).toBeNull()
  })
  it('unter der Limite keine Mehr-km', () => {
    expect(leasingPrognose(f, [{ datum: '2026-03-01', km: 70000 }], '2026-11-02')?.mehrKm).toBe(0)
  })
})
