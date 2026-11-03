import { describe, expect, it } from 'vitest'
import { leseStueckliste, mengeVon, nameVon } from './stueckliste'

// Erfundene Detailkosten im Aufbau von Eturnity (keine echten Kundendaten).

/** So liefert pdf.js die Zeilen: Titel mit Zahlen auf einer Zeile, «Hersteller * Typ» darunter. */
const ZEILENWEISE = [
  'Zell-Lebensdauer:  6000 Zyklen',
  'DETAILKOSTEN',
  'BEZEICHNUNG  MENGE  EP, CHF  PREIS, CHF',
  'Solarstromanlage  18’400.00',
  'Photovoltaikmodule  24 St.  85.00  2’040.00',
  'Muster Solar * MS-450 Black',
  'Wechselrichter  1 St.  1’900.00  1’900.00',
  'Beispiel * Hybrid 8.0',
  'DC Solarkabel  50 m  1.30  65.00',
  'Montage: Module + Unterkonstruktion  1 St.  2’400.00  2’400.00',
  'Transport zum Standort – Entladen',
  'hyd-12  02.11.2026  Created with Eturnity Software  8',
  'WICHTIGE INFORMATIONEN',
  'Zahlungsmodalitäten: 50% bei Vertragsunterzeichnung  1 St.  0.00  0.00',
  'Die Abschlusszahlung ist nach der Abnahme fällig.',
  'Batteriespeichersystem  4’100.00',
  'Batteriespeicher  2 St.  1’500.00  3’000.00',
  'Beispiel * Speicher 5.0',
  'Rabatt  -400.00',
  'Herbstrabatt (2%)  -400.00',
  'Gesamtkosten exkl. 8,1% MWST  22’100.00',
  'Optionale Komponenten Solarstromanlage inkl. 8.1% MWST  540.00',
  'Notstrom-Box  1 St.  500.00  500.00',
  'Bemerkungen:',
]

/** Andere Reihenfolge (z. B. Text aus SharePoint): eine Zeile je Seite, Titel vor den Zahlen. */
const EINE_ZEILE = [
  'Installation photovoltaïque  9’800.00  Modules photovoltaïques  Exemple * EX-430  12 St.  95.00  1’140.00  Onduleur  Exemple * Onduleur 5.0  1 St.  1’200.00  1’200.00  Sous-construction  K2 Systems * Rail  20.50 m²  40.00  820.00  Échafaudage  1 St.  1’500.00  1’500.00  COÛTS DÉTAILLÉS  DÉSIGNATION  QUANTITÉ  EP, CHF  PRIX, CHF  hyd-7  01.11.2026  Created with Eturnity Software  8',
  'INFORMATIONS IMPORTANTES  Calendrier du projet.  1 St.  0.00  0.00  Système de stockage par batterie  2’900.00  Accumulateur  Exemple * Batterie 7  1 St.  2’900.00  2’900.00  Coût total hors TVA de 8,1 %  12’700.00  COÛTS DÉTAILLÉS  DÉSIGNATION  QUANTITÉ  EP, CHF  PRIX, CHF  hyd-7  01.11.2026  Created with Eturnity Software  9',
]

describe('leseStueckliste', () => {
  it('liest Positionen zeilenweise mit Gruppen, Typen, Leistungen und Optionen', () => {
    const l = leseStueckliste(ZEILENWEISE)
    expect(l.map((p) => [p.gruppe, p.typ, p.bezeichnung, p.menge, p.einheit, p.epRappen, p.preisRappen])).toEqual([
      ['Solarstromanlage', 'modul', 'Muster Solar MS-450 Black', 24, 'St.', 8500, 204000],
      ['Solarstromanlage', 'wechselrichter', 'Beispiel Hybrid 8.0', 1, 'St.', 190000, 190000],
      ['Solarstromanlage', null, 'DC Solarkabel', 50, 'm', 130, 6500],
      [
        'Solarstromanlage',
        null,
        'Montage: Module + Unterkonstruktion Transport zum Standort – Entladen',
        1,
        'St.',
        240000,
        240000,
      ],
      ['Batteriespeichersystem', 'batterie', 'Beispiel Speicher 5.0', 2, 'St.', 150000, 300000],
      ['Solarstromanlage', null, 'Notstrom-Box', 1, 'St.', 50000, 50000],
    ])
    expect(l.map((p) => p.art)).toEqual(['material', 'material', 'material', 'leistung', 'material', 'material'])
    expect(l.map((p) => p.optional)).toEqual([false, false, false, false, false, true])
  })

  it('liest auch alles auf einer Zeile (FR) und lässt Infotexte mit 0.00 weg', () => {
    const l = leseStueckliste(EINE_ZEILE)
    expect(l.map((p) => [p.gruppe, p.typ, p.bezeichnung, p.menge, p.einheit, p.art])).toEqual([
      ['Installation photovoltaïque', 'modul', 'Exemple EX-430', 12, 'St.', 'material'],
      ['Installation photovoltaïque', 'wechselrichter', 'Exemple Onduleur 5.0', 1, 'St.', 'material'],
      ['Installation photovoltaïque', 'unterkonstruktion', 'K2 Systems Rail', 20.5, 'm²', 'material'],
      ['Installation photovoltaïque', null, 'Échafaudage', 1, 'St.', 'leistung'],
      ['Système de stockage par batterie', 'batterie', 'Exemple Batterie 7', 1, 'St.', 'material'],
    ])
  })

  it('gibt eine leere Liste ohne Detailkosten', () => {
    expect(leseStueckliste(['DEVIS 100001.01', 'PRIX HT  10’000.00 CHF'])).toEqual([])
  })

  it('zählt Module und nennt Bauteile ohne Optionen', () => {
    const l = leseStueckliste(ZEILENWEISE)
    expect(mengeVon(l, 'modul')).toBe(24)
    expect(nameVon(l, 'batterie')).toBe('2 × Beispiel Speicher 5.0')
    expect(nameVon(l, 'optimierer')).toBeUndefined()
  })
})
