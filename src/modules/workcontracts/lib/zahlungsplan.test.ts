import { describe, expect, it } from 'vitest'
import { berechneZahlungsplan, vorschlagKondition } from './zahlungsplan'

const NORMAL = [
  { anteil: 0.5, de: 'Anzahlung 50 %', fr: 'Acompte 50 %', faellig: 'unterschrift' as const, tage: 10 },
  { anteil: 0.3, de: '30 % vor Beginn', fr: '30 % avant', faellig: 'baubeginn' as const },
  { anteil: 0.2, de: 'Schlusszahlung 20 %', fr: 'Solde 20 %' },
]

describe('Zahlungsplan', () => {
  it('rechnet wie die Datenbank: 5 Rappen, Rest in der letzten Tranche', () => {
    const plan = berechneZahlungsplan(3784523, NORMAL, 'de', '2026-10-21')
    expect(plan.map((t) => t.betragRappen)).toEqual([1892260, 1135355, 756908])
    expect(plan.reduce((s, t) => s + t.betragRappen, 0)).toBe(3784523)
    expect(plan[0]?.faelligAm).toBe('2026-10-31')
    expect(plan[1]?.faelligAm).toBeNull()
  })

  it('setzt den Baubeginn und die Sprache', () => {
    const plan = berechneZahlungsplan(1000000, NORMAL, 'fr', '2026-10-21', '2027-03-01')
    expect(plan[1]).toMatchObject({ bezeichnung: '30 % avant', faelligAm: '2027-03-01' })
  })

  it('schlägt 80/20 nur für Batterie ohne Solaranlage vor', () => {
    expect(vorschlagKondition({ kwp: null, anzahlModule: null, batterie: 'LUNA 10 kWh' })).toBe('batterie')
    expect(vorschlagKondition({ kwp: 12, anzahlModule: 28, batterie: 'LUNA 10 kWh' })).toBe('normal')
  })
})
