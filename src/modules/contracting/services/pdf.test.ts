import i18n from 'i18next'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import de from '@/i18n/de.json'
import fr from '@/i18n/fr.json'
import type { Grossprojekt } from '../types'
import type { Absender } from './dokumente'
import { dossierPdf } from './dossierPdf'
import { potenzialPdf } from './potenzialPdf'

const ABSENDER: Absender = {
  firma: 'Dimension Solaire Muri GmbH',
  strasse: 'Beispielweg 1',
  plz: '5630',
  ort: 'Muri AG',
  telefon: '+41 56 000 00 00',
  email: 'info@example.test',
  person: 'Test Person',
  person_email: 'person@example.test',
}

const G = {
  id: 'x',
  nummer: 'GP-2026-0001',
  titel: 'Schulhaus Beispiel',
  bauherr: 'Gemeinde Beispiel',
  strasse: 'Dorfstrasse 5',
  plz: '5630',
  gemeinde: 'Muri AG',
  sprache: 'de',
  dachflaeche_m2: 2400,
  dach_klasse: 4,
  nutzung: 'schule',
  heizung: 'oel',
  heizung_jahr: 1998,
  geschuetzt: false,
  schaetzung: { kwp: 420, ertrag_kwh: 424_200 },
  rechnung: {},
  youdera: {},
  besichtigung: { am: '2026-11-05', punkte: { zaehler: { stand: 'problem', notiz: 'Trafo zu klein' } } },
  kontakte: [{ name: 'Anna Beispiel', rolle: 'entscheider', email: 'anna@example.test' }],
  unterlagen: { grundbuch: '2026-11-02' },
} as unknown as Grossprojekt

beforeAll(async () => {
  await i18n.init({ lng: 'de', resources: { de: { translation: de }, fr: { translation: fr } } })
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })))
})

describe('PDFs der Grossprojekte', () => {
  it('Potenzialanalyse auf Deutsch und Französisch, ohne Youdera', async () => {
    const { PDFDocument } = await import('pdf-lib')
    for (const sprache of ['de', 'fr'] as const) {
      const bytes = await potenzialPdf({ ...G, sprache }, undefined, ABSENDER, i18n.getFixedT(sprache))
      const doc = await PDFDocument.load(bytes)
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
      expect(doc.getTitle()).toBe(sprache === 'de' ? 'Potenzialanalyse Solarstrom' : 'Analyse de potentiel solaire')
    }
    // Der Partner wird dem Kunden nie genannt (Antwort Chris 03.11.2026).
    expect(JSON.stringify(de.grossprojekte.pdf)).not.toMatch(/youdera/i)
    expect(JSON.stringify(fr.grossprojekte.pdf)).not.toMatch(/youdera/i)
  })

  it('Dossier mit Kontakten, Unterlagen und Besichtigung', async () => {
    const regeln = {
      pipeline: {
        unterlagen: [{ id: 'grundbuch', de: 'Grundbuchauszug', fr: 'Extrait' }],
        besichtigung: [{ id: 'zaehler', de: 'Zähler', fr: 'Compteur' }],
      },
    }
    const bytes = await dossierPdf(G, regeln, ABSENDER, i18n.getFixedT('de'), 'de')
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getTitle()).toBe('Dossier Contracting GP-2026-0001')
  })
})
