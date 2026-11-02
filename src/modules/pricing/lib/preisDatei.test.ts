import { describe, expect, it } from 'vitest'
import { erkenneSpalten, findeKopfzeile, leseBetrag, leseCsv, leseZeilen } from './preisDatei'

describe('Preisliste aus Datei', () => {
  it('liest Beträge in Schweizer, deutscher und englischer Schreibweise', () => {
    expect(leseBetrag("1'234.50")).toBe(123450)
    expect(leseBetrag('1.234,50')).toBe(123450)
    expect(leseBetrag('CHF 4 390')).toBe(439000)
    expect(leseBetrag(88.4)).toBe(8840)
    expect(leseBetrag('auf Anfrage')).toBeNull()
  })

  it('erkennt die Spalten eines Lieferanten-Exports', () => {
    const kopf = ['Art.-Nr.', 'Bezeichnung', 'Hersteller', 'Einheit', 'Nettopreis CHF']
    expect(erkenneSpalten(kopf)).toEqual({ artikelnummer: 0, name: 1, hersteller: 2, einheit: 3, ek: 4 })
  })

  it('findet die Kopfzeile unter einem Titel und liest nur Zeilen mit Preis', () => {
    const blatt = [
      ['Preisliste November 2026'],
      [],
      ['SKU', 'Component', 'Supplier', 'Price'],
      ['6349902', 'Huawei LUNA2000-10-S0', 'Krannich', '4390.00'],
      ['', 'Leerzeile ohne Preis', '', ''],
      ['6361868', 'Aiko A485-MCE54Mb', 'Krannich', 88.4],
    ]
    const k = findeKopfzeile(blatt)
    expect(k).toBe(2)
    const z = leseZeilen(blatt, k, erkenneSpalten(blatt[k] ?? []))
    expect(z).toHaveLength(2)
    expect(z[0]).toEqual({ artikelnummer: '6349902', name: 'Huawei LUNA2000-10-S0', ek_rappen: 439000, lieferant: 'Krannich' })
  })

  it('liest CSV mit Semikolon und Anführungszeichen', () => {
    expect(leseCsv('Nr;Name;Preis\n1;"Kabel; 6 mm²";2,50\n')).toEqual([
      ['Nr', 'Name', 'Preis'],
      ['1', 'Kabel; 6 mm²', '2,50'],
    ])
  })
})
