import { describe, expect, it } from 'vitest'
import type { Mail } from '../types'
import { dauer, fristInfo, inAnsicht, kopfzahlen, mitte, sortiere } from './anzeige'

const basis: Mail = {
  id: '1',
  eingang_am: '2026-11-02T07:00:00Z',
  von_email: 'kunde@bluewin.ch',
  von_name: 'Tom Gerber',
  betreff: 'Fehler 3002',
  vorschau: null,
  web_link: null,
  hat_anhang: false,
  postfach: 'me',
  postfach_person_id: null,
  art: 'stoerung',
  sprache: 'de',
  dringend: false,
  zusammenfassung: null,
  sortiert: 'ki',
  stand: 'offen',
  frist_am: '2026-11-02T09:00:00Z',
  eskalation_am: null,
  erledigt_am: null,
  erledigt_grund: null,
  reaktion_minuten: null,
  zustaendig_id: 'ich',
  zustaendig: 'Chris',
  vertretung_fuer: null,
  erledigt_von: null,
  kontakt: null,
  lead: null,
  offerte: null,
  projekt: null,
  rechnung: null,
  bestellung: null,
  fall: null,
}
const mail = (m: Partial<Mail>): Mail => ({ ...basis, ...m })

describe('Posteingang: Anzeige', () => {
  it('schreibt Dauern lesbar', () => {
    expect(dauer(45)).toBe('45 min')
    expect(dauer(160)).toBe('2 h 40')
    expect(dauer(120)).toBe('2 h')
    expect(dauer(4 * 24 * 60)).toBe('4 Tage')
    expect(dauer(4 * 24 * 60, 'fr')).toBe('4 jours')
  })

  it('zeigt die Frist: überschritten, bald, heute, beantwortet', () => {
    const jetzt = new Date('2026-11-02T09:40:00Z')
    expect(fristInfo(basis, 'de', jetzt)).toMatchObject({
      ton: 'kritisch',
      schluessel: 'ueber',
      werte: { dauer: '2 h 40' },
    })
    expect(fristInfo(basis, 'de', new Date('2026-11-02T08:30:00Z'))).toMatchObject({
      ton: 'warnung',
      schluessel: 'noch',
    })
    expect(fristInfo(basis, 'de', new Date('2026-11-02T06:00:00Z'))).toMatchObject({
      ton: 'ok',
      schluessel: 'heute',
      werte: { zeit: '10:00' },
    })
    expect(
      fristInfo(mail({ stand: 'erledigt', erledigt_grund: 'beantwortet', reaktion_minuten: 38 }), 'de', jetzt),
    ).toMatchObject({ ton: 'ok', schluessel: 'beantwortetNach', werte: { dauer: '38 min' } })
    expect(fristInfo(mail({ stand: 'info', frist_am: null }), 'de', jetzt).schluessel).toBe('info')
  })

  it('filtert nach Ansicht', () => {
    expect(inAnsicht(basis, 'warten', 'ich')).toBe(true)
    expect(inAnsicht(mail({ stand: 'info' }), 'warten', 'ich')).toBe(false)
    expect(inAnsicht(mail({ stand: 'info' }), 'neu', 'ich')).toBe(true)
    expect(inAnsicht(basis, 'meine', 'andere')).toBe(false)
    expect(inAnsicht(mail({ stand: 'abgelegt' }), 'abgelegt', null)).toBe(true)
  })

  it('sortiert Offene nach Frist, den Rest neueste zuerst', () => {
    const a = mail({ id: 'a', frist_am: '2026-11-02T12:00:00Z' })
    const b = mail({ id: 'b', frist_am: '2026-11-02T08:00:00Z' })
    const c = mail({ id: 'c', stand: 'info', frist_am: null, eingang_am: '2026-11-02T08:00:00Z' })
    const d = mail({ id: 'd', stand: 'info', frist_am: null, eingang_am: '2026-11-02T09:00:00Z' })
    expect(sortiere([c, a, d, b]).map((m) => m.id)).toEqual(['b', 'a', 'd', 'c'])
  })

  it('zählt Wartende, Überfällige und die Reaktionszeit von heute', () => {
    const jetzt = new Date('2026-11-02T09:40:00Z')
    const z = kopfzahlen(
      [
        basis,
        mail({ frist_am: '2026-11-02T12:00:00Z' }),
        mail({
          stand: 'erledigt',
          erledigt_grund: 'beantwortet',
          reaktion_minuten: 30,
          erledigt_am: '2026-11-02T08:00:00Z',
        }),
        mail({
          stand: 'erledigt',
          erledigt_grund: 'beantwortet',
          reaktion_minuten: 90,
          erledigt_am: '2026-11-02T09:00:00Z',
        }),
        mail({ stand: 'abgelegt' }),
      ],
      jetzt,
    )
    expect(z).toEqual({ warten: 2, ueber: 1, mitteHeute: 60, abgelegt: 1 })
    expect(mitte([])).toBeNull()
    expect(mitte([5, 1, 3])).toBe(3)
  })
})
