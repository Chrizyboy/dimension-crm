import { describe, expect, it } from 'vitest'
import type { HandbuchEintrag } from '../types'
import {
  dauerText,
  fassung,
  groesse,
  meldungNummer,
  naechsteVersion,
  passt,
  sortiere,
  titelAusDateiname,
} from './handbuch'

const eintrag = (teil: Partial<HandbuchEintrag>): HandbuchEintrag => ({
  id: '1',
  art: 'prozess',
  titel_de: 'Lead-Terminierung',
  titel_fr: null,
  beschreibung_de: null,
  beschreibung_fr: null,
  version: '1.0',
  datum: null,
  dauer_s: null,
  reihenfolge: null,
  sprache: null,
  versionen: [],
  erstellt_am: '',
  geaendert_am: '',
  datei_de: { id: 'd', name: 'de.pdf', mime_typ: null, bytes: null, speicher_pfad: 'x', sharepoint_url: null },
  datei_fr: null,
  vorschaubild: null,
  ...teil,
})

describe('Handbuch', () => {
  it('zählt die Version hoch wie die Vorlage', () => {
    expect(naechsteVersion('1.0')).toBe('1.1')
    expect(naechsteVersion('2.9')).toBe('2.10')
    expect(naechsteVersion('A')).toBe('')
    expect(naechsteVersion(null)).toBe('')
  })

  it('schlägt den Titel aus dem Dateinamen vor', () => {
    expect(titelAusDateiname('Prozess_Lead-Terminierung_30.09.2026.pdf')).toBe('Lead-Terminierung')
    expect(titelAusDateiname('Processus_Prise_de_rendez-vous_30.09.2026.pdf')).toBe('Prise de rendez-vous')
  })

  it('nimmt ohne französische Datei die deutsche und sagt es', () => {
    const f = fassung(eintrag({ titel_fr: 'Prise de rendez-vous' }), 'fr')
    expect(f.titel).toBe('Prise de rendez-vous')
    expect(f.datei?.name).toBe('de.pdf')
    expect(f.nurDeutsch).toBe(true)
    expect(fassung(eintrag({}), 'de').nurDeutsch).toBe(false)
  })

  it('sucht in beiden Sprachen und sortiert Videos nach Reihenfolge', () => {
    expect(passt(eintrag({ titel_fr: 'Prise de rendez-vous' }), 'RENDEZ')).toBe(true)
    expect(passt(eintrag({}), 'mail')).toBe(false)
    const v = (titel: string, reihenfolge: number | null) => eintrag({ art: 'video', titel_de: titel, reihenfolge })
    expect(sortiere([v('B', null), v('C', 1), v('A', 2)], 'de').map((e) => e.titel_de)).toEqual(['C', 'A', 'B'])
  })

  it('zeigt Dauer, Grösse und Nummer lesbar', () => {
    expect(dauerText(182)).toBe('3:02')
    expect(dauerText(null)).toBe('')
    expect(groesse(382592)).toBe('374 KB')
    expect(groesse(10027872)).toBe('9.6 MB')
    expect(meldungNummer({ nummer: 7 })).toBe('T007')
  })
})
