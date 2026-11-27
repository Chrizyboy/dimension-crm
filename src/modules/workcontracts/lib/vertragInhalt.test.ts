import { describe, expect, it } from 'vitest'
import type { OffertPosition, Werkvertrag, WerkvertragEinstellung } from '../types'
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
    // Ohne Stückliste keine offenen Optionen; «Diverses» ist eine vereinbarte Leistung
    expect(v.optionen).toEqual([])
    expect(v.leistungen.some((l) => l.some((t) => t.text.includes('travaux AC offerts')))).toBe(true)
    expect(v.kundeUnterschreibt).toBe(true)
    expect(v.ziele).toBeUndefined()
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

  it('Auftragsbestätigung: eigener Titel, ohne Unterschrift des Kunden', () => {
    const v = vertragInhalt({ ...BEISPIEL, sprache: 'de', angaben: { art: 'auftragsbestaetigung' } }, EINSTELLUNG)
    expect(v.titel).toMatch(/^Auftragsbestätigung/)
    expect(v.kundeUnterschreibt).toBe(false)
    expect(v.abschnitt1).toBe('1. Bestätigter Auftrag')
  })

  it('Positionen 1:1 aus der Offerte, nur nicht bestellte Optionen als Optionen', () => {
    const positionen: OffertPosition[] = [
      { bezeichnung: 'Batterie Beispiel 5 kWh', menge: 2, einheit: 'Stk', art: 'material', optional: false },
      { bezeichnung: 'Erweiterungsmodul 5 kWh', menge: 1, einheit: 'Stk', art: 'material', optional: true },
      { bezeichnung: 'Wallbox Beispiel', menge: 1, einheit: 'Stk', art: 'material', optional: true },
      { bezeichnung: 'Montage und Anschluss', menge: 1, einheit: 'pauschal', art: 'leistung', optional: false },
    ]
    const w: Werkvertrag = { ...BEISPIEL, sprache: 'de', angaben: { gewaehlt: ['Wallbox Beispiel'] } }
    const v = vertragInhalt(w, EINSTELLUNG, positionen)
    const texte = v.leistungen.map((l) => l.map((t) => t.text).join(''))
    expect(texte.some((t) => t.includes('2 × Batterie Beispiel 5 kWh') && t.includes('Wallbox Beispiel'))).toBe(true)
    expect(texte).toContain('Montage und Anschluss')
    expect(texte.some((t) => t.startsWith('Inbetriebnahme'))).toBe(true)
    // Steht die Inbetriebnahme schon in der Offerte, kommt sie nicht doppelt
    const mitIbn = vertragInhalt(w, EINSTELLUNG, [
      ...positionen,
      {
        bezeichnung: 'Kalibrierung und Inbetriebnahme',
        menge: 1,
        einheit: 'pauschal',
        art: 'leistung',
        optional: false,
      },
    ]).leistungen.map((l) => l.map((t) => t.text).join(''))
    expect(mitIbn.filter((t) => /Inbetriebnahme/.test(t))).toEqual(['Kalibrierung und Inbetriebnahme'])
    expect(v.optionen.map((o) => o.text)).toEqual(['Erweiterungsmodul 5 kWh'])
    // Alles bestellt: der Abschnitt «Optionen» fällt weg
    const alle = vertragInhalt(
      { ...w, angaben: { gewaehlt: ['Wallbox Beispiel', 'Erweiterungsmodul 5 kWh'] } },
      EINSTELLUNG,
      positionen,
    )
    expect(alle.optionen).toEqual([])
  })

  it('Ziele als Funktionen in der Vertragssprache, ohne garantierten Prozentwert', () => {
    const v = vertragInhalt(
      {
        ...BEISPIEL,
        angaben: { ziele: ['eigenverbrauch', 'Pompe à chaleur en priorité'], bemerkungen: 'Accès par la cour' },
      },
      EINSTELLUNG,
    )
    expect(v.ziele?.titel).toBe('2. Objectifs et fonctionnalités')
    const punkte = v.ziele?.punkte.map((p) => p.map((t) => t.text).join('')) ?? []
    expect(punkte[0]).toMatch(/autoconsommation/)
    expect(punkte[1]).toBe('Pompe à chaleur en priorité')
    expect(punkte.join(' ')).not.toMatch(/\d+\s*%/)
    expect(v.abschnitt2).toBe('3. Délais')
    // Termine: Montage, Elektriker und Inbetriebnahme nie als «ein Einsatz»
    expect(v.terminHinweis).toMatch(/différents jours|jours différents/)
  })
})
