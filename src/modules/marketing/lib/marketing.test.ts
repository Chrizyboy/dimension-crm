import { describe, expect, it } from 'vitest'
import type { Zielkontakt } from '../types'
import { postHinweise, postText, newsletterPruefen, woerter } from './texte'
import { adresslisteCsv, anrede, empfaenger, filtern, fuellen, LEERER_FILTER, zaehlen } from './zielgruppe'

const k = (x: Partial<Zielkontakt>): Zielkontakt => ({
  id: x.id ?? 'k',
  kundennummer: 12,
  name: 'Anna Muster',
  anrede: null,
  vorname: 'Anna',
  nachname: 'Muster',
  firma: null,
  email: 'anna@beispiel.ch',
  telefon: null,
  sprache: 'de',
  strasse: 'Dorfstrasse 1',
  plz: '5630',
  ort: 'Muri AG',
  kanton: 'AG',
  standort: 'muri',
  stand: 'verbaut',
  gruppe: 'kunde',
  batterie: false,
  wallbox: false,
  waermepumpe: false,
  anlage_seit: '2021-05-01',
  werbesperre: false,
  einwilligung: null,
  versandgrund: 'kunde',
  zuletzt_angeschrieben: null,
  abmelde_schluessel: 's',
  ...x,
})

describe('Zielgruppe filtern', () => {
  const liste = [
    k({ id: '1' }),
    k({ id: '2', gruppe: 'offerte', kanton: 'FR', sprache: 'fr', email: null }),
    k({ id: '3', werbesperre: true }),
    k({ id: '4', batterie: true, anlage_seit: '2025-01-01' }),
  ]
  const heute = new Date('2026-10-23')
  it('blendet Abgemeldete aus, ausser gewünscht', () => {
    expect(filtern(liste, LEERER_FILTER, null, heute).map((x) => x.id)).toEqual(['1', '2', '4'])
    expect(filtern(liste, { ...LEERER_FILTER, abgemeldete: true }, null, heute)).toHaveLength(4)
  })
  it('filtert nach Gruppe, Kanton, Sprache und Kontaktweg', () => {
    expect(filtern(liste, { ...LEERER_FILTER, gruppen: ['offerte'] }, null, heute).map((x) => x.id)).toEqual(['2'])
    expect(filtern(liste, { ...LEERER_FILTER, kantone: ['FR'] }, null, heute).map((x) => x.id)).toEqual(['2'])
    expect(filtern(liste, { ...LEERER_FILTER, sprache: 'fr' }, null, heute).map((x) => x.id)).toEqual(['2'])
    expect(filtern(liste, { ...LEERER_FILTER, kontakt: 'mail' }, null, heute).map((x) => x.id)).toEqual(['1', '4'])
  })
  it('Anlage-Filter nur für Kunden: ohne Batterie, Anlage ≥ 3 Jahre', () => {
    expect(filtern(liste, { ...LEERER_FILTER, anlage: 'ohne_batterie' }, null, heute).map((x) => x.id)).toEqual(['1'])
    expect(filtern(liste, { ...LEERER_FILTER, anlage: 'alt' }, null, heute).map((x) => x.id)).toEqual(['1'])
  })
  it('zählt für die Chips ohne den eigenen Filter', () => {
    const f = { ...LEERER_FILTER, gruppen: ['offerte' as const] }
    expect(zaehlen(filtern(liste, f, 'gruppen', heute), 'gruppe').get('kunde')).toBe(2)
  })
})

describe('Empfänger', () => {
  it('Mail: ohne Adresse und doppelte fallen weg', () => {
    const r = empfaenger([k({ id: '1' }), k({ id: '2', email: 'ANNA@beispiel.ch' }), k({ id: '3', email: '' })], 'mail')
    expect(r.liste.map((x) => x.id)).toEqual(['1'])
    expect(r.doppelt).toBe(1)
    expect(r.ohne).toBe(1)
  })
  it('Brief braucht Strasse, PLZ und Ort', () => {
    expect(empfaenger([k({ strasse: null })], 'brief').ohne).toBe(1)
  })
})

describe('Anrede und Platzhalter', () => {
  it('Anrede wie V233', () => {
    expect(anrede(k({}), 'de')).toBe('Guten Tag Anna Muster')
    expect(anrede(k({}), 'fr')).toBe('Bonjour Anna Muster,')
    expect(anrede(k({ vorname: null, firma: 'Muster AG' }), 'de')).toBe('Sehr geehrte Damen und Herren')
    expect(anrede(k({ vorname: null }), 'fr')).toBe('Madame, Monsieur,')
  })
  it('setzt Platzhalter ein und lässt unbekannte stehen', () => {
    expect(fuellen('{Anrede}\n{Kundennummer} {Ort} {Unbekannt} {Abmeldelink}', k({}), 'de', { abmeldelink: 'L' })).toBe(
      'Guten Tag Anna Muster\nK0012 Muri AG {Unbekannt} L',
    )
  })
})

describe('Adressliste', () => {
  it('CSV mit BOM, Strichpunkt und Anführungszeichen bei Bedarf', () => {
    const csv = adresslisteCsv(
      [k({ firma: 'A; B AG' })],
      () => 'Kunde',
      () => 'Muri',
    )
    expect(csv.startsWith('﻿Kundennummer;Firma;')).toBe(true)
    expect(csv).toContain(
      'K0012;"A; B AG";Anna;Muster;Anna Muster;Dorfstrasse 1;5630;Muri AG;AG;DE;anna@beispiel.ch;;Kunde;Muri',
    )
  })
})

describe('Texte', () => {
  it('zählt Wörter und prüft den Newsletter', () => {
    expect(woerter('{Anrede}\n\nGerne informieren wir Sie.')).toBe(5)
    const h = newsletterPruefen({ de: { betreff: '', text: 'Gerne informieren wir Sie über …' } }, ['de'], 450)
    expect(h.map((x) => x.schluessel)).toEqual(['betreffFehlt', 'ohneAnrede', 'platzhalterText'])
  })
  it('Post: Text je Sprache und Hinweise nach den Regeln', () => {
    const p = {
      sprache: 'de_fr' as const,
      netzwerke: ['instagram' as const, 'linkedin' as const],
      bilder: [],
      texte: { instagram: { de: 'Hallo #a', fr: 'Salut' }, linkedin: { de: 'Hallo ☀️ #a #b #c #d', fr: 'Salut' } },
    }
    expect(postText(p, 'instagram')).toBe('Hallo #a\n\nSalut')
    expect(postHinweise(p).map((x) => x.schluessel)).toEqual([
      'hashtagsInstagram',
      'bildFehlt',
      'hashtagsLinkedin',
      'emojisLinkedin',
    ])
  })
})

describe('Serienbrief', () => {
  it('Fensteradresse: Firma mit z. Hd., sonst Name', async () => {
    const { adressblock } = await import('./serienbrief')
    expect(adressblock(k({}))).toEqual(['Anna Muster', 'Dorfstrasse 1', '5630 Muri AG'])
    expect(adressblock(k({ firma: 'Muster AG' }))).toEqual([
      'Muster AG',
      'Anna Muster',
      'Dorfstrasse 1',
      '5630 Muri AG',
    ])
  })
  it('erzeugt ein PDF mit einer Seite je Brief', async () => {
    const { serienbriefPdf } = await import('./serienbrief')
    const v = {
      absender: 'Dimension Solaire GmbH\nMuri',
      ort: 'Muri',
      betreff: 'Ihre Anlage',
      text: '{Anrede}\n\nText',
    }
    const bytes = await serienbriefPdf([k({ id: '1' }), k({ id: '2', sprache: 'fr' })], { de: v, fr: v }, 'Chris')
    const { PDFDocument } = await import('pdf-lib')
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2)
  })
})
