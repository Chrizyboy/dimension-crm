// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { stoerungPruefen } from './stoerung.ts'

// Felder wie das Formular auf dimension-solaire.ch/de/service-wartung/#stoerung; erfundene Person.
const GUT = {
  name: 'Markus Brunner',
  email: 'Markus.Brunner@Example.ch',
  phone: '079 412 33 18',
  address: 'Bachstrasse 12, 5630 Muri',
  project: '241087',
  problem: 'Anlage produziert nicht mehr',
  message: 'Seit gestern\r\nkein Ertrag, Fehler 2062',
  consent: 'on',
  consentText: 'Ich bin einverstanden …',
  consentVersion: 'formular-2026-10',
  lang: 'de',
  page: '/de/service-wartung/',
  website: '',
  elapsedMs: '48000',
}

describe('stoerungPruefen', () => {
  it('übernimmt eine vollständige Meldung, Mail klein, Zeilenumbrüche vereinheitlicht', () => {
    const p = stoerungPruefen(GUT, '3f1c2a9e-1111-4222-8333-444455556666')
    expect(p.art).toBe('ok')
    if (p.art !== 'ok') return
    expect(p.meldung.email).toBe('markus.brunner@example.ch')
    expect(p.meldung.message).toBe('Seit gestern\nkein Ertrag, Fehler 2062')
    expect(p.meldung.lang).toBe('de')
    expect(p.meldung.idempotency_key).toBe('3f1c2a9e-1111-4222-8333-444455556666')
  })

  it('verwirft Spam still bei gefülltem Honeypot, schnelles Ausfüllen ist erlaubt', () => {
    expect(stoerungPruefen({ ...GUT, website: 'http://spam' }).art).toBe('spam')
    expect(stoerungPruefen({ ...GUT, elapsedMs: 900 }).art).toBe('ok')
  })

  it('meldet fehlende Pflichtfelder wie das Formular', () => {
    const p = stoerungPruefen({ ...GUT, email: 'kein-mail', phone: '123', consent: false, problem: '' })
    expect(p).toEqual({ art: 'fehler', felder: ['email', 'phone', 'problem', 'consent'] })
  })

  it('nimmt Französisch und lässt Projektnummer und Beschreibung weg, wenn leer', () => {
    const p = stoerungPruefen({
      ...GUT,
      lang: 'fr',
      project: '',
      message: '  ',
      problem: 'L’installation ne produit plus',
    })
    expect(p.art).toBe('ok')
    if (p.art !== 'ok') return
    expect(p.meldung).toMatchObject({ lang: 'fr', project: null, message: null })
  })

  it('übernimmt nur einen sauberen Idempotenz-Schlüssel', () => {
    const p = stoerungPruefen({ ...GUT, idempotency_key: "x'; drop table" })
    expect(p.art === 'ok' && p.meldung.idempotency_key).toBe(null)
  })
})
