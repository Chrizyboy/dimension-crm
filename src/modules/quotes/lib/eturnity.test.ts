import { leseEturnityOfferte, rappen, zahl } from './eturnity'
import { zeilenAusTextteilen } from './pdfZeilen'

// Erfundene Offerten im Aufbau von Eturnity (keine echten Kundendaten).
const DEUTSCH = [
  '--- Seite 1',
  'IHRE PERSÖNLICHE OFFERTE',
  'Hans Muster  Dimension Solaire GmbH',
  '200099 - MUSTER - PHOTOVOLTAIKANLAGE',
  'KOSTEN*  Solarstromanlage (12.6 kWp)  21’000.00 CHF',
  'Batteriespeichersystem (10.2 kWh)  8’000.00 CHF',
  'Rabatt (5%)  -1’450.00 CHF',
  'MWST 8,1%  2’231.55 CHF',
  'Kosten inkl. MWST  29’781.55 CHF',
  'FÖRDERUNGEN**  Einmalvergütung (Photovoltaik)  -4’536.00 CHF',
  'IHRE INVESTITION  Ihre Gesamtinvestition  25’245.55 CHF',
  'Erwartete Steuerersparnis***  -6’311.40 CHF',
  'Effektive Kosten  18’934.15 CHF',
  '200099  02.11.2026  1',
  'Verbrauch  6’200 kWh',
  '72%  41%',
  'Solaranlage  12.6 kWp',
  'Unabhängigkeitsgrad  Eigenverbrauch',
  'Jahresertrag  12’480 kWh',
  'WIRTSCHAFTLICHKEIT PV-SYSTEM',
  "100'000",
  "61'250",
  'Total exkl. MWST  27’550.00 CHF',
  "50'000  18'934",
  'RENDITE  PRODUKTIONSKOSTEN',
  'Rendite Ihrer PV-Anlage  12.4%  Ihr Solarstrompreis  8.10 Rappen',
  'Photovoltaikmodule  28 St.  80.00  2’240.00',
  'Muster Solar * MS-450 Black',
  'Wechselrichter  1 St.  2’000.00  2’000.00',
  'Beispiel * Hybrid 10.0',
  'Batteriespeicher  1 St.  6’500.00  6’500.00',
  'Beispiel * Speicher 10.2',
  'Gesamtkosten exkl. 8,1% MWST  27’550.00',
]

const FRANZOESISCH = [
  'VOTRE OFFRE PERSONNALISÉE',
  '100999 - EXEMPLE - OFFRE BATTERIE',
  'COÛTS*  Système de batterie (9,2 kWh)  9 186,70 CHF',
  'TVA 8,1%  744,10 CHF',
  'Total TVA incluse  9 930,80 CHF',
  'Déductions fiscales attendues***  -2 482,70 CHF',
  'Coût effectif  7 448,10 CHF',
  '100999  30.09.2026  1',
  'Batterie  1 pcs  3 591,20  3 591,20',
  'Exemple * BAT-9 (9.2 kWh)',
  'Onduleur  1 pcs  1 728,15  1 728,15',
  'Exemple * OND-8K',
  'Total hors TVA 8,1%  9 186,70',
]

describe('Eturnity-Offerte lesen', () => {
  it('liest Nummer, Datum, Beträge und Anlage aus der deutschen Offerte', () => {
    const w = leseEturnityOfferte(DEUTSCH)
    expect(w).toMatchObject({
      sprache: 'de',
      nummer: '200099',
      datum: '2026-11-02',
      betragRappen: 2_755_000,
      totalInklRappen: 2_978_155,
      rabattProzent: 5,
      kwp: 12.6,
      batterieKwh: 10.2,
      anzahlModule: 28,
      modul: 'Muster Solar MS-450 Black',
      wechselrichter: 'Beispiel Hybrid 10.0',
      batterie: 'Beispiel Speicher 10.2',
    })
  })

  it('liest die Wirtschaftlichkeit inklusive Ertrag aus der Grafik', () => {
    expect(leseEturnityOfferte(DEUTSCH).wirtschaftlichkeit).toEqual({
      eivRappen: -453_600,
      steuerersparnisRappen: -631_140,
      effektiveKostenRappen: 1_893_415,
      verbrauchKwh: 6200,
      jahresertragKwh: 12_480,
      batterieKwh: 10.2,
      autarkieProzent: 72,
      eigenverbrauchProzent: 41,
      renditeProzent: 12.4,
      solarstrompreisRappen: 8.1,
      ertrag25JahreRappen: 6_125_000,
    })
  })

  it('versteht französische Offerten mit Leerzeichen und Komma', () => {
    const w = leseEturnityOfferte(FRANZOESISCH)
    expect(w).toMatchObject({
      sprache: 'fr',
      nummer: '100999',
      datum: '2026-09-30',
      betragRappen: 918_670,
      totalInklRappen: 993_080,
      batterieKwh: 9.2,
      wechselrichter: 'Exemple OND-8K',
      batterie: 'Exemple BAT-9 (9.2 kWh)',
    })
    expect(w.kwp).toBeUndefined()
  })

  it('lässt leer, was nicht im Text steht', () => {
    expect(leseEturnityOfferte(['Irgendein anderes PDF'])).toEqual({ sprache: 'de', wirtschaftlichkeit: {} })
  })
})

describe('Zahlen und Zeilen', () => {
  it('liest Schweizer und französische Schreibweisen', () => {
    expect(zahl('39’874.30')).toBe(39874.3)
    expect(zahl('10 048,75')).toBe(10048.75)
    expect(rappen('-9’504.00')).toBe(-950400)
    expect(zahl('13,44')).toBe(13.44)
  })

  it('setzt Textstücke einer Seite in der richtigen Reihenfolge zu Zeilen zusammen', () => {
    const t = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y] })
    expect(zeilenAusTextteilen([t('CHF', 300, 500), t('Total', 10, 501), t('Kopf', 10, 700), t(' ', 0, 0)])).toEqual([
      'Kopf',
      'Total  CHF',
    ])
  })
})
