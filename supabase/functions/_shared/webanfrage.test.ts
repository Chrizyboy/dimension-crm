// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { adresseTeilen, nameTeilen, webAnfrage } from './webanfrage.ts'

// Felder wie der Offerten-Assistent auf dimension-solaire.ch nach validateLead; erfundene Personen.
const OFFERTE = {
  id: 'DS-20261102-A1B2C3D4',
  type: 'offerte',
  receivedAt: '2026-11-02T12:41:00.000Z',
  data: {
    lang: 'de',
    page: '/de/offerte/',
    utm_source: 'google',
    utm_campaign: 'pv-aargau',
    interest: ['pv', 'speicher', 'ladestation', 'klima'],
    adresse: 'Lindenweg 7, 5612 Villmergen',
    zip: '5612',
    egid: '190233',
    roofArea: 82,
    roofKwh: 14100,
    gebaeude: 'efh',
    eigentum: 'ja',
    verbrauch: 5500,
    heizung: 'oel',
    eauto: 'geplant',
    zeitpunkt: '6-12m',
    finanzierung: true,
    vorname: 'Sandra',
    nachname: 'Huber',
    email: 'Sandra.Huber@Example.ch',
    telefon: '079 318 22 41',
    kontakt: 'rueckruf',
    slots: ['abend'],
    message: 'Wir bekommen im Frühling ein E-Auto.\r\nBitte abends anrufen.',
  },
}

describe('webAnfrage', () => {
  it('übersetzt den Offerten-Assistenten in einen Lead', () => {
    const r = webAnfrage(OFFERTE)
    expect(r.art).toBe('ok')
    if (r.art !== 'ok') return
    const l = r.lead
    expect(l.kennung).toBe('web:DS-20261102-A1B2C3D4')
    expect(l.eingang_am).toBe('2026-11-02')
    expect(l.kontakt).toEqual({
      vorname: 'Sandra',
      nachname: 'Huber',
      email: 'sandra.huber@example.ch',
      telefon: '079 318 22 41',
    })
    expect(l.objekt).toEqual({
      strasse: 'Lindenweg 7',
      plz: '5612',
      ort: 'Villmergen',
      gebaeudeart: 'einfamilienhaus',
      eigentum: 'eigentuemer',
    })
    expect(l.lead.interesse).toEqual(['pv', 'batterie', 'wallbox'])
    expect(l.lead.zeithorizont).toBe('ueber_6')
    expect(l.lead.finanzierung).toBe('beides')
    expect(l.lead.erreichbarkeit).toBe('abends')
    expect(l.lead.kommentar_kunde).toBe('Wir bekommen im Frühling ein E-Auto.\nBitte abends anrufen.')
    expect(l.lead.notiz_intern).toContain('Weiteres Interesse: klima')
    expect(l.lead.notiz_intern).toContain('Verbrauch: 5500 kWh/Jahr')
    expect(l.herkunft).toMatchObject({
      formular: 'offerte',
      seite: '/de/offerte/',
      utm_source: 'google',
      kontaktwunsch: 'rueckruf',
    })
    expect(l.dach).toEqual({ flaeche_m2: 82, ertrag_kwh: 14100, egid: '190233' })
    expect(l.verbrauch_kwh).toBe(5500)
  })

  it('nimmt den Rückruf mit Namen in einem Feld und französischer Sprache', () => {
    const r = webAnfrage({
      id: 'DS-20261102-FFFF0000',
      type: 'rueckruf',
      data: {
        lang: 'fr',
        name: 'Jean-Marc de Riedmatten',
        phone: '026 912 44 10',
        slots: ['vormittag', 'nachmittag', 'abend'],
      },
    })
    expect(r.art).toBe('ok')
    if (r.art !== 'ok') return
    expect(r.lead.sprache).toBe('fr')
    expect(r.lead.kontakt).toEqual({ vorname: 'Jean-Marc de', nachname: 'Riedmatten', telefon: '026 912 44 10' })
    expect(r.lead.lead.erreichbarkeit).toBe('ganztags')
  })

  it('macht aus Kontakt ohne Rückruf, Rechner ohne Kontaktwunsch und Service keinen Lead', () => {
    expect(webAnfrage({ id: 'DS-1-ABCDEF', type: 'kontakt', data: { email: 'a@b.ch', callback: false } })).toEqual({
      art: 'kein_lead',
      grund: 'kein_rueckruf',
    })
    expect(webAnfrage({ id: 'DS-1-ABCDEF', type: 'report-email', data: { email: 'a@b.ch' } }).art).toBe('kein_lead')
    expect(webAnfrage({ id: 'DS-1-ABCDEF', type: 'service', data: { email: 'a@b.ch' } }).art).toBe('kein_lead')
  })

  it('verlangt Referenz und Mail oder Telefon', () => {
    expect(webAnfrage({ type: 'rueckruf', data: { name: 'X' } })).toEqual({ art: 'fehler', felder: ['id', 'email'] })
  })
})

describe('adresseTeilen und nameTeilen', () => {
  it('teilt Adresse und Ort', () => {
    expect(adresseTeilen('Rue de la Gare 3, 1630 Bulle')).toEqual({
      strasse: 'Rue de la Gare 3',
      plz: '1630',
      ort: 'Bulle',
    })
    expect(adresseTeilen('1630 Bulle')).toEqual({ plz: '1630', ort: 'Bulle' })
    expect(adresseTeilen('Bachstrasse 12', '5630')).toEqual({ strasse: 'Bachstrasse 12', plz: '5630' })
    expect(nameTeilen('Huber')).toEqual({ nachname: 'Huber' })
  })
})
