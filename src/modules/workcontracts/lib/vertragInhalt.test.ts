import { describe, expect, it } from 'vitest'
import type { Werkvertrag, WerkvertragEinstellung } from '../types'
import { vertragInhalt, vorschlagGegenstand } from './vertragInhalt'

/** Erfundener Vertrag (keine echten Kundendaten im Repo). */
export const BEISPIEL: Werkvertrag = {
  id: 'w1',
  nummer: '193001',
  status: 'erstellt',
  sprache: 'fr',
  version: 1,
  betragRappen: 1000001,
  erstelltDatum: '2026-10-31',
  versendetAm: null,
  unterschriebenAm: null,
  notiz: null,
  offerteId: 'o1',
  projektId: 'p1',
  kontaktId: 'k1',
  name: 'Jules Exemple',
  kundennummer: 4711,
  anrede: null,
  vorname: 'Jules',
  nachname: 'Exemple',
  kontaktFirma: null,
  email: 'jules@example.ch',
  telefon: '+41 79 000 00 00',
  kontaktAdresse: { strasse: 'Route d’Exemple 1', plz: '1630', ort: 'Bulle' },
  objekt: { strasse: 'Route d’Exemple 1', plz: '1630', ort: 'Bulle' },
  firma: { name: 'Dimension Solaire Sàrl', strasse: 'Chemin des Crêts 4', plz: '1630', ort: 'Bulle', mwstNr: null },
  offerteNummer: '193001',
  angebotAm: '2026-10-21',
  titel: 'Batterie 13,8 kWh',
  kwp: null,
  anzahlModule: null,
  wechselrichter: 'SUN2000-12K-MAP0',
  batterie: 'Huawei LUNA2000-14-S1 (13,8 kWh)',
  baubeginn: null,
  kondition: '70_30',
  standort: 'bulle',
  zahlungsplan: [
    { bezeichnung: '70 % à la signature du contrat', betragRappen: 700000, faelligAm: '2026-11-10' },
    { bezeichnung: '30 % après la mise en service', betragRappen: 300001, faelligAm: null },
  ],
  suchtext: '',
  angaben: { beginn: 'semaine du 9 novembre', optionen: { divers: 'travaux AC offerts' } },
  anzahlung: null,
}

export const EINSTELLUNG: WerkvertragEinstellung = {
  unterzeichner: 'Chris Rosenberg',
  ansprechperson: 'Chris Rosenberg',
  telefon_de: '+41 56 552 11 25',
  telefon_fr: '+41 26 919 13 00',
  email: 'info@dimension-solaire.ch',
  adresse: 'Luzernerstrasse 35, 5630 Muri / Chemin des Crêts 4, 1630 Bulle',
  kondition_pv: '40_30_30',
  kondition_batterie: '70_30',
}

describe('Werkvertrag nach Vorlage Muri', () => {
  it('Batterie auf Französisch: Leistungen der Batterie, Raten, Unterzeichner', () => {
    const v = vertragInhalt(BEISPIEL, EINSTELLUNG)
    expect(v.titel).toBe('Contrat d’entreprise entre')
    expect(v.gegenstand).toBe('Batterie de stockage à Bulle')
    expect(v.leistungen[0]?.[1]?.text).toBe(' du système de stockage')
    expect(v.optionen.map((o) => o.an)).toEqual([false, true, false, true])
    expect(v.termine[0]?.[1]).toBe('semaine du 9 novembre')
    expect(v.raten).toEqual([
      ['70 % à la signature du contrat :', "CHF 7'000.00"],
      ['30 % après la mise en service :', "CHF 3'000.01"],
    ])
    expect(v.unterzeichner).toBe('Chris Rosenberg')
    expect(v.firmaOrtDatum).toBe('Lieu, date : Bulle, 31.10.2026')
    expect(v.unternehmer[3]?.[1]).toBe('+41 26 919 13 00')
    expect(v.agb).toHaveLength(20)
  })

  it('Photovoltaik auf Deutsch mit eigenem Gegenstand', () => {
    const w: Werkvertrag = { ...BEISPIEL, sprache: 'de', kwp: 19.2, anzahlModule: 44, batterie: null, angaben: {} }
    expect(vorschlagGegenstand(w)).toBe('19.2 kWp Photovoltaikanlage in Bulle')
    const v = vertragInhalt({ ...w, angaben: { gegenstand: 'PV Scheune' } }, EINSTELLUNG)
    expect(v.gegenstand).toBe('PV Scheune')
    expect(v.abschnitt3).toBe('3. Werklohn (Preis)')
    expect(v.termine[0]?.[1]).toBe('nach Absprache')
    expect(v.agb[0]?.[0]).toBe('1. Einleitung')
    expect(v.unternehmer[3]?.[1]).toBe('+41 56 552 11 25')
  })
})
