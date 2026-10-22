// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  anfrageErkennen,
  emlLesen,
  landingpageLesen,
  messeLesen,
  messeZuAnfrage,
  naechsterWerktag,
  solarGuideLesen,
  zeilen,
} from './anfrage.ts'

// Aufbau wie die Mails von solar-guide.ch (Frage in einer Zelle, Antwort in der nächsten); erfundene Person.
const SG_HTML = `<html><body><p>Bitte Rückruf am Vormittag</p><p>Von: anfrage@solar-guide.ch</p><table>
<tr><td>Wo soll die Photovoltaikanlage installiert werden?</td></tr><tr><td>Einfamilienhaus</td></tr>
<tr><td>Welche Dachform hat das Gebäude?</td></tr><tr><td>Satteldach</td></tr>
<tr><td>Sind Sie Eigentümer der Liegenschaft?</td></tr><tr><td>Eigentümer</td></tr>
<tr><td>Welches Finanzierungsmodell kommt für Sie in Frage?</td></tr><tr><td>Kaufen</td></tr>
<tr><td>Wann soll die Photovoltaik-Anlage installiert werden?</td></tr><tr><td>in 4-6 Monaten</td></tr>
<tr><td>Strasse und Hausnummer</td></tr><tr><td>Musterweg&nbsp;5</td></tr>
<tr><td>PLZ</td></tr><tr><td>5630</td></tr><tr><td>Ort</td></tr><tr><td>Muri AG</td></tr>
<tr><td>Vorname</td></tr><tr><td>Anna</td></tr><tr><td>Nachname</td></tr><tr><td>Beispiel</td></tr>
<tr><td>E-Mail-Adresse</td></tr><tr><td>anna@example.org &lt;mailto:anna@example.org&gt;</td></tr>
<tr><td>Ihre Telefonnummer</td></tr><tr><td>079 000 00 00</td></tr>
<tr><td>Erreichbarkeit</td></tr><tr><td>Vormittag (8-12 Uhr)</td></tr>
<tr><td>Kommentar</td></tr><tr><td>-</td></tr></table></body></html>`

describe('solar-guide.ch', () => {
  it('liest alle Felder wie V233', () => {
    const a = solarGuideLesen(SG_HTML, 'solar-guide.ch: Anfrage von Anna Beispiel in 5630 Muri AG')!
    expect(a.quelle).toBe('solar_guide')
    expect(a.kontakt).toEqual({
      vorname: 'Anna',
      nachname: 'Beispiel',
      email: 'anna@example.org',
      telefon: '079 000 00 00',
    })
    expect(a.objekt).toMatchObject({
      strasse: 'Musterweg 5',
      plz: '5630',
      ort: 'Muri AG',
      gebaeudeart: 'Einfamilienhaus',
    })
    expect(a.lead).toMatchObject({
      finanzierung: 'Kaufen',
      zeithorizont: 'in 4-6 Monaten',
      erreichbarkeit: 'Vormittag (8-12 Uhr)',
    })
    expect(a.lead.kommentar_kunde).toBeUndefined() // «-» heisst kein Kommentar
    expect(a.lead.notiz_intern).toBe('Bitte Rückruf am Vormittag') // Notiz vor der Weiterleitung, ohne «Von:»
  })

  it('nimmt Name und Ort aus dem Betreff, wenn der Inhalt fehlt', () => {
    const a = solarGuideLesen('<p>kaum Inhalt</p>', 'WG: solar-guide.ch: Anfrage von Max Muster in 1630 Bulle')!
    expect(a.kontakt).toMatchObject({ vorname: 'Max', nachname: 'Muster' })
    expect(a.objekt).toMatchObject({ plz: '1630', ort: 'Bulle' })
  })

  it('erkennt Fremdes nicht als Anfrage', () => {
    expect(solarGuideLesen('<p>Newsletter</p>', 'Ihre Rechnung')).toBeNull()
  })
})

describe('Landingpage', () => {
  const html = `<div class="h1">Neue Anfrage</div><table>
    <tr><td>Vorname</td><td>Lea</td></tr><tr><td>Nachname</td><td>Test</td></tr>
    <tr><td>Telefon</td><td>+41 76 000 00 00</td></tr><tr><td>E-Mail</td><td>lea@example.org</td></tr>
    <tr><td>Adresse</td><td>Dorfstrasse 1, 5630 Muri AG Karte</td></tr>
    <tr><td>Interesse</td><td>PV und Batterie</td></tr><tr><td>Eigentum</td><td>STWEG</td></tr>
    <tr><td>Dach</td><td>Ziegel</td></tr></table>`

  it('liest Paare, Adresse und Eigentum', () => {
    const a = landingpageLesen(html, 'Leads Landingpage: Neue Anfrage 21.10.2026, 14:05')!
    expect(a.art).toBe('neu')
    expect(a.eingang_am).toBe('2026-10-21')
    expect(a.kontakt).toMatchObject({
      vorname: 'Lea',
      nachname: 'Test',
      telefon: '+41 76 000 00 00',
      email: 'lea@example.org',
    })
    expect(a.objekt).toMatchObject({ strasse: 'Dorfstrasse 1', plz: '5630', ort: 'Muri', eigentum: 'Miteigentum' })
    expect(a.lead.kommentar_kunde).toBe('Interesse: PV und Batterie\nDach: Ziegel')
  })

  it('erkennt Ergänzungen und Französisch', () => {
    const a = landingpageLesen(
      '<table><tr><td>Prénom</td><td>Luc</td></tr><tr><td>Téléphone</td><td>079 1</td></tr></table>',
      'COMPLÉMENT',
    )!
    expect(a.art).toBe('ergaenzung')
    expect(a.sprache).toBe('fr')
  })
})

describe('Messe-App', () => {
  const daten = {
    sid: 'S42',
    nr: '7',
    event: 'Muri Expo',
    typ: 'wettbewerb',
    by: 'Chris',
    at: '2026-10-23T10:00:00Z',
    sprache: 'Deutsch',
    vorname: 'Ruth',
    nachname: 'Probe',
    tel: '079 222 33 44',
    int: ['pv', 'wp'],
    wohn: 'haus',
    termin: { datum: '2026-10-30', zeit: '10:00' },
  }
  const b64 = Buffer.from(JSON.stringify(daten)).toString('base64')

  it('liest neue und gelöschte Einträge', () => {
    expect(messeLesen(`<p>DSMESSE:${b64}:ENDE</p>`)?.neu?.sid).toBe('S42')
    const del = Buffer.from(JSON.stringify({ sids: ['S42'] })).toString('base64')
    expect(messeLesen(`DSMESSE-DEL:${del}:ENDE`)).toEqual({ geloescht: ['S42'] })
    expect(messeLesen('DSMESSE:kaputt:ENDE')).toBeNull()
  })

  it('macht daraus eine Anfrage mit Wiedervorlage', () => {
    const a = messeZuAnfrage(messeLesen(`DSMESSE:${b64}:ENDE`)!.neu!)
    expect(a).toMatchObject({ quelle: 'messe', messe_sid: 'S42', sprache: 'de', eingang_am: '2026-10-23' })
    expect(a.objekt).toMatchObject({ gebaeudeart: 'Einfamilienhaus', eigentum: 'Eigentümer' })
    expect(a.lead.interesse).toEqual(['pv', 'waermepumpe'])
    expect(a.lead.wiedervorlage_am).toBe('2026-10-26') // Freitag → Montag
    expect(a.lead.wiedervorlage_grund).toBe('Terminwunsch bestätigen: 30.10.2026, 10:00 Uhr')
    expect(a.lead.kommentar_kunde).toContain('MESSE · WETTBEWERB + BERATUNG')
  })

  it('überspringt das Wochenende', () => {
    expect(naechsterWerktag('2026-10-24')).toBe('2026-10-26')
  })
})

describe('.eml', () => {
  it('liest Betreff (kodiert) und Text aus mehrteiligen Mails', () => {
    const eml = [
      'From: anfrage@solar-guide.ch',
      'Message-ID: <abc@solar-guide.ch>',
      'Date: Wed, 21 Oct 2026 14:05:00 +0200',
      'Subject: =?utf-8?Q?solar-guide.ch:_Anfrage_von_Z=C3=BCri_Test_in_8000_Z=C3=BCrich?=',
      'Content-Type: multipart/alternative; boundary="b1"',
      '',
      '--b1',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      'PLZ=0A8000=0AOrt=0AZ=C3=BCrich',
      '--b1--',
    ].join('\r\n')
    const m = emlLesen(eml)
    expect(m.betreff).toBe('solar-guide.ch: Anfrage von Züri Test in 8000 Zürich')
    expect(m.inhalt).toContain('Zürich')
    expect(m.kennung).toBe('<abc@solar-guide.ch>')
    expect(m.datum).toBe('2026-10-21T12:05:00.000Z')
    const a = anfrageErkennen(m.inhalt, m.betreff, m.von)!
    expect(a.objekt).toMatchObject({ plz: '8000', ort: 'Zürich' })
  })

  it('macht aus HTML Zeilen', () => {
    expect(zeilen('<td>A&amp;B</td><td>&#228;</td><br>x')).toEqual(['A&B', 'ä', 'x'])
  })
})
