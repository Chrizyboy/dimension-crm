import { describe, expect, it } from 'vitest'
import type { Partnerzeile } from '../types'
import {
  bewertungText,
  feldAlsText,
  feldAnzeige,
  feldEingabe,
  listenZahlen,
  nachweisStand,
  normalisiereUid,
  rollenfelder,
  rollenZaehlen,
  uidGueltig,
} from './rollen'

const wert = (felder: unknown) => ({
  schluessel: 'lieferant',
  text_de: 'Lieferant',
  text_fr: 'Fournisseur',
  reihenfolge: 1,
  farbe: null,
  eigenschaften: { felder },
})

describe('Rollenfelder', () => {
  it('liest die Felder aus der Auswahlliste, unbekannter Typ wird Text', () => {
    expect(
      rollenfelder(
        wert([
          { k: 'kundennummer', t: 'text', de: 'Unsere Kundennummer', fr: 'Notre numéro client' },
          { k: 'neu', t: 'farbe', de: 'Neu', fr: 'Nouveau' },
          { t: 'text' },
        ]),
      ),
    ).toEqual([
      { k: 'kundennummer', t: 'text', de: 'Unsere Kundennummer', fr: 'Notre numéro client' },
      { k: 'neu', t: 'text', de: 'Neu', fr: 'Nouveau' },
    ])
    expect(rollenfelder(undefined)).toEqual([])
    expect(rollenfelder(wert('kaputt'))).toEqual([])
  })

  it('zeigt Beträge, Prozent, Datum und Telefon im Schweizer Format', () => {
    expect(feldAnzeige({ k: 'm', t: 'chf', de: '', fr: '' }, 50000)).toBe('CHF 500.00')
    expect(feldAnzeige({ k: 'p', t: 'prozent', de: '', fr: '' }, 3)).toBe('3 %')
    expect(feldAnzeige({ k: 'd', t: 'datum', de: '', fr: '' }, '2026-11-03')).toBe('03.11.2026')
    expect(feldAnzeige({ k: 't', t: 'telefon', de: '', fr: '' }, '0263001122')).toBe('+41 26 300 11 22')
    expect(feldAnzeige({ k: 'x', t: 'text', de: '', fr: '' }, '')).toBeNull()
  })

  it('liest Eingaben: Franken in Rappen, Zahlen, Webseite mit https', () => {
    expect(feldEingabe({ k: 'm', t: 'chf', de: '', fr: '' }, "1'200")).toEqual({ wert: 120000, fehler: false })
    expect(feldEingabe({ k: 'm', t: 'chf', de: '', fr: '' }, 'viel')).toEqual({ wert: null, fehler: true })
    expect(feldEingabe({ k: 'p', t: 'prozent', de: '', fr: '' }, '2,5 %')).toEqual({ wert: 2.5, fehler: false })
    expect(feldEingabe({ k: 'u', t: 'url', de: '', fr: '' }, 'www.beispiel.ch')).toEqual({
      wert: 'https://www.beispiel.ch',
      fehler: false,
    })
    expect(feldEingabe({ k: 'x', t: 'text', de: '', fr: '' }, '  ')).toEqual({ wert: null, fehler: false })
    expect(feldAlsText({ k: 'm', t: 'chf', de: '', fr: '' }, 120000)).toBe("1'200.00")
  })
})

describe('Liste', () => {
  const zeile = (z: Partial<Partnerzeile>): Partnerzeile =>
    ({ rollen: [], gesucheAlt: 0, gesucheOffen: 0, auftraegeLaufend: 0, nachweisBis: null, ...z }) as Partnerzeile

  it('zählt Rollen und Kennzahlen', () => {
    const zeilen = [
      zeile({ rollen: ['lieferant', 'hersteller'] }),
      zeile({ rollen: ['subunternehmer'], nachweisBis: '2026-11-20', auftraegeLaufend: 2 }),
      zeile({ rollen: ['netzbetreiber'], gesucheOffen: 3, gesucheAlt: 1 }),
      zeile({ rollen: ['subunternehmer'], nachweisBis: '2027-06-01' }),
    ]
    expect(rollenZaehlen(zeilen)).toEqual({ lieferant: 1, hersteller: 1, subunternehmer: 2, netzbetreiber: 1 })
    expect(listenZahlen(zeilen, '2026-11-03')).toEqual({
      partner: 4,
      gesucheAlt: 1,
      gesucheOffen: 3,
      nachweiseFaellig: 1,
      auftraegeLaufend: 2,
    })
  })

  it('kennt den Stand eines Nachweises', () => {
    expect(nachweisStand('2026-11-01', '2026-11-03')).toBe('abgelaufen')
    expect(nachweisStand('2026-12-03', '2026-11-03')).toBe('bald')
    expect(nachweisStand('2026-12-04', '2026-11-03')).toBe('ok')
    expect(nachweisStand(null, '2026-11-03')).toBe('ohne')
  })

  it('zeigt die Bewertung', () => {
    expect(bewertungText(4.25)).toBe('4.3 ★')
    expect(bewertungText(null)).toBeNull()
  })
})

describe('UID', () => {
  it('schreibt die UID einheitlich', () => {
    expect(normalisiereUid('che 116 281 710')).toBe('CHE-116.281.710')
    expect(normalisiereUid('unbekannt')).toBe('unbekannt')
  })

  it('prüft die Prüfziffer', () => {
    expect(uidGueltig('CHE-116.281.710')).toBe(true)
    expect(uidGueltig('CHE-116.281.710 MWST')).toBe(true)
    expect(uidGueltig('CHE-116.281.711')).toBe(false)
    expect(uidGueltig('116.281.710')).toBe(false)
  })
})
