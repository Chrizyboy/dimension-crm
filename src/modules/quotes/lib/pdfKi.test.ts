import { describe, expect, it } from 'vitest'
import { brauchtKi, ergaenzeMitKi, type KiOfferte } from './pdfKi'

const KI: KiOfferte = {
  nummer: 'A-2026-77',
  datum: '2026-10-01',
  sprache: 'fr',
  kunde: { vorname: 'Paul', nachname: 'Exemple', firma: null },
  betrag_exkl: 24_800.5,
  kwp: 12.4,
  module: 28,
  wechselrichter: 'WR 10',
  batterie: null,
  batterie_kwh: null,
}

describe('Offerten-PDF mit KI', () => {
  it('braucht KI, wenn Nummer oder Betrag fehlt', () => {
    expect(brauchtKi({ wirtschaftlichkeit: {} })).toBe(true)
    expect(brauchtKi({ nummer: '1', betragRappen: 100, wirtschaftlichkeit: {} })).toBe(false)
  })
  it('füllt nur Lücken; was die Regeln lesen, gilt', () => {
    const w = ergaenzeMitKi({ nummer: 'E-1', wirtschaftlichkeit: {} }, KI)
    expect(w.nummer).toBe('E-1')
    expect(w.betragRappen).toBe(2_480_050)
    expect(w.kunde).toBe('Paul Exemple')
    expect(w.anzahlModule).toBe(28)
  })
})
