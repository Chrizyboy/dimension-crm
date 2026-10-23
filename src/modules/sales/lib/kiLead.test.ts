import { describe, expect, it } from 'vitest'
import type { KiMailErgebnis } from '@/services/ki'
import { leadAusMail } from './kiLead'

const ERGEBNIS: KiMailErgebnis = {
  erkannt: {
    typ: 'lead',
    sprache: 'de',
    zusammenfassung: 'Wünscht PV mit Speicher für EFH.',
    kontakt: { anrede: 'frau', vorname: 'Lea', nachname: 'Beispiel', firma: null, email: null, telefon: '076 123 45 67' },
    adresse: { strasse: 'Testweg 1', plz: '5630', ort: 'Muri' },
    lead: { interesse: ['pv', 'batterie', 'erfunden'], gebaeudeart: 'einfamilienhaus', dachform: 'kuppel', kommentar: 'Speicher gewünscht' },
    anliegen: { thema: null, dringend: false, antwort_noetig: true },
    aufgabe: null,
  },
  kandidaten: [],
  mail: { von: 'Lea Beispiel <Lea@Beispiel.test>', betreff: 'Solaranlage', text: '…', datum: '' },
}

describe('leadAusMail', () => {
  const erlaubt = { interesse: ['pv', 'batterie'], gebaeudeart: ['einfamilienhaus'], dachform: ['satteldach'] }
  it('übernimmt Kontakt, Adresse und nur erlaubte Auswahlwerte', () => {
    const l = leadAusMail(ERGEBNIS, erlaubt)
    expect(l).toMatchObject({ anrede: 'frau', vorname: 'Lea', plz: '5630', gebaeudeart: 'einfamilienhaus', dachform: '' })
    expect(l.interesse).toEqual(['pv', 'batterie'])
  })
  it('E-Mail aus dem Absender, klein geschrieben', () => {
    expect(leadAusMail(ERGEBNIS, erlaubt).email).toBe('lea@beispiel.test')
  })
  it('ungültige PLZ bleibt leer', () => {
    const e = { ...ERGEBNIS, erkannt: { ...ERGEBNIS.erkannt, adresse: { strasse: null, plz: 'CH-5630', ort: null } } }
    expect(leadAusMail(e, erlaubt).plz).toBe('')
  })
})
