// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { eingangPruefen } from './ki_eingang.ts'

const BEISPIEL = {
  lieferant: 'Strassenverkehrsamt Kanton Aargau',
  nummer: '2026-1511295',
  datum: '2026-11-06',
  faellig_am: '2027-01-31',
  betrag: 419,
  mwst: null,
  waehrung: 'chf',
  skonto_prozent: null,
  skonto_tage: null,
  iban: 'CH30 3000 0001 5000 2130 8',
  referenz: '00 00821 14422 02601 51129 50010',
  grund: 'KIA EV9',
  periode_von: '2027-01-01',
  periode_bis: '2027-12-31',
  bemerkung: null,
}

describe('Eingangsrechnung lesen', () => {
  it('übernimmt die Verkehrssteuer-Rechnung aus dem Beispiel', () => {
    const v = eingangPruefen(BEISPIEL)
    expect(v.betrag_rappen).toBe(41900)
    expect(v.iban).toBe('CH3030000001500021308')
    expect(v.referenz).toBe('000082114422026015112950010')
    expect(v.waehrung).toBe('CHF')
    expect(v.periode_von).toBe('2027-01-01')
  })
  it('rechnet Skonto-Frist vom Rechnungsdatum', () => {
    const v = eingangPruefen({ ...BEISPIEL, skonto_prozent: 2, skonto_tage: 10 })
    expect(v.skonto_prozent).toBe(2)
    expect(v.skonto_bis).toBe('2026-11-16')
  })
  it('verwirft Unplausibles statt zu raten', () => {
    const v = eingangPruefen({
      ...BEISPIEL,
      datum: '6.11.2026',
      mwst: 500,
      iban: 'keine',
      periode_von: '2027-12-31',
      periode_bis: '2027-01-01',
      grund: 'KIA/EV9_neu',
    })
    expect(v.datum).toBeNull()
    expect(v.mwst_rappen).toBeNull()
    expect(v.iban).toBeNull()
    expect(v.periode_von).toBeNull()
    expect(v.grund).toBe('KIA EV9 neu')
  })
})
