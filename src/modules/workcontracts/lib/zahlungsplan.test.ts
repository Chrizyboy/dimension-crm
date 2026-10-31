import { describe, expect, it } from 'vitest'
import { berechneZahlungsplan, vorschlagKondition } from './zahlungsplan'

const NORMAL = [
  { anteil: 0.5, de: 'Anzahlung 50 %', fr: 'Acompte 50 %', faellig: 'unterschrift' as const, tage: 10 },
  { anteil: 0.3, de: '30 % vor Beginn', fr: '30 % avant', faellig: 'baubeginn' as const },
  { anteil: 0.2, de: 'Schlusszahlung 20 %', fr: 'Solde 20 %' },
]
const SIEBZIG = [
  {
    anteil: 0.7,
    de: '70 % bei Vertragsunterzeichnung',
    fr: '70 % à la signature du contrat',
    faellig: 'unterschrift' as const,
    tage: 10,
  },
  { anteil: 0.3, de: '30 % nach Inbetriebnahme', fr: '30 % après la mise en service' },
]
const EIGENE = [
  { betrag: true, de: 'Anzahlung', fr: 'Acompte', faellig: 'unterschrift' as const, tage: 10 },
  { anteil: 1, de: 'Saldo nach Inbetriebnahme', fr: 'Solde' },
]

describe('Zahlungsplan', () => {
  it('rechnet wie die Datenbank: ganze Franken, Rest in der letzten Rate', () => {
    const plan = berechneZahlungsplan(3784523, NORMAL, 'de', '2026-10-21')
    expect(plan.map((t) => t.betragRappen)).toEqual([1892300, 1135400, 756823])
    expect(plan.reduce((s, t) => s + t.betragRappen, 0)).toBe(3784523)
    expect(plan[0]?.faelligAm).toBe('2026-10-31')
    expect(plan[1]?.faelligAm).toBeNull()
  })

  it('70/30 wie im Vertrag Bovey', () => {
    const plan = berechneZahlungsplan(1000001, SIEBZIG, 'fr', '2026-10-26')
    expect(plan.map((t) => [t.bezeichnung, t.betragRappen])).toEqual([
      ['70 % à la signature du contrat', 700000],
      ['30 % après la mise en service', 300001],
    ])
  })

  it('eigene Anzahlung CHF 4000 wie Rotzetter, Rest nach Inbetriebnahme', () => {
    const plan = berechneZahlungsplan(629683, EIGENE, 'de', '2026-10-12', null, 400000)
    expect(plan.map((t) => t.betragRappen)).toEqual([400000, 229683])
    expect(berechneZahlungsplan(629683, EIGENE, 'de', '2026-10-12')).toEqual([])
    expect(berechneZahlungsplan(500000, EIGENE, 'de', '2026-10-12', null, 600000).map((t) => t.betragRappen)).toEqual([
      500000,
    ])
  })

  it('setzt den Baubeginn und die Sprache', () => {
    const plan = berechneZahlungsplan(1000000, NORMAL, 'fr', '2026-10-21', '2027-03-01')
    expect(plan[1]).toMatchObject({ bezeichnung: '30 % avant', faelligAm: '2027-03-01' })
  })

  it('schlägt für Batterie ohne Solaranlage die Batterie-Bedingung vor', () => {
    expect(vorschlagKondition({ kwp: null, anzahlModule: null, batterie: 'LUNA 10 kWh' })).toBe('70_30')
    expect(vorschlagKondition({ kwp: 12, anzahlModule: 28, batterie: 'LUNA 10 kWh' })).toBe('normal')
    expect(vorschlagKondition({ kwp: 12, anzahlModule: 28, batterie: null }, { pv: '55_45', batterie: '100' })).toBe(
      '55_45',
    )
  })
})
