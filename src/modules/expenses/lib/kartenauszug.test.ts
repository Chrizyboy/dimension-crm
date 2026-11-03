import { describe, expect, it } from 'vitest'
import { kartenBetrag, kartenDatum, leseKartenauszug } from './kartenauszug'

describe('Kartenauszug lesen', () => {
  it('liest Beträge im Schweizer und französischen Format', () => {
    expect(kartenBetrag("1'234.50")).toBe(123450)
    expect(kartenBetrag('1 234,50')).toBe(123450)
    expect(kartenBetrag('CHF 96.40')).toBe(9640)
    expect(kartenBetrag('-12.40')).toBe(-1240)
    expect(kartenBetrag('')).toBeNull()
    expect(kartenBetrag('Total')).toBeNull()
  })

  it('liest Datum in allen üblichen Formen', () => {
    expect(kartenDatum('31.10.2026')).toBe('2026-10-31')
    expect(kartenDatum('1.9.26')).toBe('2026-09-01')
    expect(kartenDatum('2026-10-31')).toBe('2026-10-31')
    expect(kartenDatum('Saldo')).toBeNull()
  })

  it('findet die Kopfzeile nach Bankzeilen und überspringt Totale', () => {
    const csv = [
      'Kontoauszug Viseca;;;;',
      'Karteninhaber;Dimension Solaire Muri GmbH;;;',
      'Einkaufsdatum;Buchungsdatum;Beschreibung;Kartennummer;Belastung CHF;Gutschrift CHF',
      '27.10.2026;28.10.2026;"AVIA Bulle; Tankstelle";**** 4711;96.40;',
      '30.10.2026;31.10.2026;Rückvergütung;**** 4711;;12.00',
      ';;Total;;96.40;12.00',
    ].join('\r\n')
    const r = leseKartenauszug(csv)
    expect(r.zeilen).toEqual([
      { datum: '2026-10-27', betrag_rappen: 9640, text: 'AVIA Bulle; Tankstelle', karte: '**** 4711' },
      { datum: '2026-10-30', betrag_rappen: -1200, text: 'Rückvergütung', karte: '**** 4711' },
    ])
    expect(r.unlesbar).toBe(1)
  })

  it('versteht einen französischen Auszug mit Komma', () => {
    const csv = 'Date de transaction,Libellé,Montant CHF\n29/10/2026,Parking Fribourg,"25,00"\n'
    expect(leseKartenauszug(csv).zeilen).toEqual([
      { datum: '2026-10-29', betrag_rappen: 2500, text: 'Parking Fribourg', karte: null },
    ])
  })

  it('ohne erkennbare Kopfzeile wird nichts eingelesen', () => {
    expect(leseKartenauszug('a;b;c\n1;2;3').zeilen).toEqual([])
  })
})
