import { describe, expect, it } from 'vitest'
import { kategorieAusWrName, leseVkBerechnung, wpAusName } from './vkExcel'

describe('leseVkBerechnung', () => {
  it('liest Module mit Gruppentitel, Brutto und Rabatt', () => {
    const zeilen = leseVkBerechnung([
      {
        sheet: 'VK Berechnung Module',
        data: [
          ['Art.-Nr.', 'Bezeichnung', 'Brutto', 'Rabatt', 'EK', 'Marge', 'VK', 'Skonto'],
          ['Preise 2026'],
          ['Ja-Soalr', null, null, null, null, null, null, null],
          ['JA1', 'JAM54D40 440 Wp', 200, 0.1, null, 0.3, null, 0.02],
          ['Longi', null, null, null, null, null, null, null],
          ['LO1', 'LR5-54HTH-430M', null, null, 95.5, null, null, null],
          [null, null, null, null, null, null, null, null],
        ],
      },
      { sheet: 'Notizen', data: [['x', 'y']] },
    ])
    expect(zeilen).toEqual([
      expect.objectContaining({
        artikelnummer: 'JA1',
        hersteller_gruppe: 'JA Solar',
        ek_rappen: 18000,
        marge: 0.3,
        skonto: 0.02,
        leistung_w: 440,
      }),
      expect.objectContaining({
        artikelnummer: 'LO1',
        hersteller_gruppe: 'LONGi',
        ek_rappen: 9550,
        marge: 0.25,
        skonto: 0.015,
        leistung_w: 430,
      }),
    ])
  })

  it('ordnet WR- und UK-Zeilen der richtigen Kategorie zu', () => {
    const zeilen = leseVkBerechnung([
      {
        sheet: 'VK Berechnung WR',
        data: [
          ['Nr', 'Name'],
          ['Kopf'],
          ['Huawei'],
          ['H1', 'LUNA2000-5-S0 Batterie', null, null, 1500],
          ['H2', 'SUN2000-10KTL', null, null, 1200],
        ],
      },
      { sheet: 'VK Berechnung UK', data: [['Nr', 'Name'], ['Kopf'], ['UK K2'], ['K1', 'Dachhaken', null, null, 12]] },
    ])
    expect(zeilen.map((z) => [z.kategorie, z.hersteller_gruppe])).toEqual([
      ['batteriespeicher', 'Huawei'],
      ['wechselrichter', 'Huawei'],
      ['unterkonstruktion', 'K2 Systems'],
    ])
  })
})

describe('Hilfen', () => {
  it('erkennt Kategorien und Wp', () => {
    expect(kategorieAusWrName('Tigo TS4-A-O Optimizer')).toBe('optimierer')
    expect(kategorieAusWrName('Smart Power Sensor DTSU666')).toBe('energiemanagement_zaehler')
    expect(wpAusName('Aiko A480-MAH54Mw')).toBe(480)
    expect(wpAusName('Kabel 6 mm²')).toBeNull()
  })
})
