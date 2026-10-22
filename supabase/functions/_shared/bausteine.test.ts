// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { kundeFuerAbaninja, kundeLesen, passt, rechnungLesen, strasseTeilen } from './abaninja.ts'
import { absenderPruefen } from './aspsms.ts'
import { DienstFehler, rufe, wartezeit } from './http.ts'
import { entschluessle, pkceChallenge, verschluessle } from './krypto.ts'
import { anmeldedatenLesen, kontoPasst } from './microsoft.ts'
import {
  adressen,
  mailZuOutlook,
  mailZuVerlauf,
  terminZuEintrag,
  terminZuOutlook,
  utcZuZuerich,
  zuerichZuUtc,
} from './outlook.ts'
import { dateipfad, kundenordner, sichererName } from './sharepoint.ts'
import { freigabeKennung, versandFehler } from './versand.ts'

describe('Zeitzone Zürich', () => {
  it('rechnet Sommer- und Winterzeit richtig um', () => {
    expect(zuerichZuUtc('2026-07-01T10:00:00.0000000')).toBe('2026-07-01T08:00:00.000Z')
    expect(zuerichZuUtc('2026-12-01T10:00:00')).toBe('2026-12-01T09:00:00.000Z')
    expect(utcZuZuerich('2026-10-25T09:00:00.000Z')).toBe('2026-10-25T10:00:00') // Tag der Umstellung
    expect(utcZuZuerich('2026-10-24T09:00:00.000Z')).toBe('2026-10-24T11:00:00')
  })
})

describe('Outlook', () => {
  it('übernimmt Termine, lässt abgesagte weg', () => {
    const e = terminZuEintrag({
      id: 'E1',
      subject: ' Besprechung ',
      showAs: 'oof',
      start: { dateTime: '2026-11-02T08:00:00.0000000', timeZone: 'Europe/Zurich' },
      end: { dateTime: '2026-11-02T09:30:00.0000000', timeZone: 'Europe/Zurich' },
      location: { displayName: 'Dorfstrasse 1, 5630 Muri' },
      webLink: 'https://outlook.office.com/x',
    })
    expect(e).toMatchObject({
      beginn: '2026-11-02T07:00:00.000Z',
      ende: '2026-11-02T08:30:00.000Z',
      betreff: 'Besprechung',
      plz: '5630',
      anzeige_als: 'oof',
    })
    expect(terminZuEintrag({ id: 'x', isCancelled: true, start: { dateTime: 'a' }, end: { dateTime: 'b' } })).toBeNull()
  })

  it('baut den Lead-Termin wie V233 (unterwegs, Ortszeit)', () => {
    const t = terminZuOutlook({
      betreff: 'PV',
      html: '<p>x</p>',
      beginn: '2026-11-02T09:00:00.000Z',
      dauerMin: 90,
      ort: 'Muri',
      teilnehmer: [{ email: 'a@b.ch' }],
    })
    expect(t).toMatchObject({
      showAs: 'workingElsewhere',
      start: { dateTime: '2026-11-02T10:00:00', timeZone: 'Europe/Zurich' },
      end: { dateTime: '2026-11-02T11:30:00' },
      attendees: [{ type: 'required', emailAddress: { address: 'a@b.ch' } }],
    })
  })

  it('macht aus dem Ausgangskorb eine Mail, Text sicher als HTML', () => {
    const m = mailZuOutlook({
      an: 'a@b.ch; a@b.ch, c@d.ch',
      cc: 'kaputt',
      betreff: 'Offerte',
      text: 'Guten Tag <Herr>\nGruss',
    })
    expect(m.toRecipients).toEqual([{ emailAddress: { address: 'a@b.ch' } }, { emailAddress: { address: 'c@d.ch' } }])
    expect(m.ccRecipients).toEqual([])
    expect((m.body as { content: string }).content).toContain('Guten Tag &lt;Herr&gt;<br>Gruss')
    expect(adressen(' x@y.ch ,X@Y.ch')).toEqual(['x@y.ch'])
  })

  it('liest Mails für den Kundenverlauf', () => {
    expect(
      mailZuVerlauf({
        id: '1',
        internetMessageId: '<m@x>',
        subject: 'Frage',
        bodyPreview: ' Hallo\n  Welt ',
        receivedDateTime: '2026-10-20T10:00:00Z',
        from: { emailAddress: { address: 'Kunde@Example.org' } },
        toRecipients: [{ emailAddress: { address: 'chris@dimension-solaire.ch' } }],
      }),
    ).toEqual({
      kennung: '<m@x>',
      zeitpunkt: '2026-10-20T10:00:00Z',
      von: 'kunde@example.org',
      an: ['chris@dimension-solaire.ch'],
      betreff: 'Frage',
      vorschau: 'Hallo Welt',
    })
  })
})

describe('Verschlüsselung der Microsoft-Verbindung', () => {
  const schluessel = Buffer.alloc(32, 7).toString('base64')

  it('verschlüsselt jedes Mal anders und entschlüsselt wieder', async () => {
    const a = await verschluessle('geheimes-token', schluessel)
    const b = await verschluessle('geheimes-token', schluessel)
    expect(a).not.toBe(b)
    expect(a).not.toContain('geheim')
    expect(await entschluessle(a, schluessel)).toBe('geheimes-token')
  })

  it('merkt veränderte Daten und falsche Schlüssel', async () => {
    const a = await verschluessle('x', schluessel)
    await expect(entschluessle(a, Buffer.alloc(32, 8).toString('base64'))).rejects.toThrow()
    await expect(entschluessle(`${a.slice(0, -2)}AA`, schluessel)).rejects.toThrow()
    await expect(verschluessle('x', 'zu-kurz')).rejects.toThrow()
  })

  it('PKCE wie RFC 7636 (Beispiel aus Anhang B)', async () => {
    expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })
})

describe('Microsoft-Konto prüfen', () => {
  const token = (d: object) => `x.${Buffer.from(JSON.stringify(d)).toString('base64url')}.y`
  const tenant = '11111111-2222-3333-4444-555555555555'

  it('nur das eigene Konto im eigenen Mandanten', () => {
    const d = anmeldedatenLesen(token({ preferred_username: 'Chris@Dimension-Solaire.ch', tid: tenant }))
    expect(kontoPasst(d, 'chris@dimension-solaire.ch', tenant)).toBe(true)
    expect(kontoPasst(d, 'loris@dimension-solaire.ch', tenant)).toBe(false)
    expect(
      kontoPasst(
        anmeldedatenLesen(token({ email: 'chris@dimension-solaire.ch', tid: 'fremd' })),
        'chris@dimension-solaire.ch',
        tenant,
      ),
    ).toBe(false)
    expect(anmeldedatenLesen('kaputt')).toBeNull()
  })
})

describe('Aufrufe mit Zeitlimit und Wiederholung', () => {
  afterEach(() => vi.unstubAllGlobals())
  const warte = () => Promise.resolve()

  it('wiederholt bei 503 und gibt die gute Antwort zurück', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok'))
    vi.stubGlobal('fetch', f)
    const r = await rufe('https://x', {}, { warte })
    expect(await r.text()).toBe('ok')
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('wiederholt keinen Versand (versuche: 1) und meldet Netzfehler', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    vi.stubGlobal('fetch', f)
    await expect(rufe('https://x', {}, { versuche: 1, warte })).rejects.toMatchObject({ code: 'netzwerk' })
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('beachtet Retry-After, aber höchstens 5 Sekunden', () => {
    expect(wartezeit('2', 500)).toBe(2000)
    expect(wartezeit('120', 500)).toBe(5000)
    expect(wartezeit(null, 500)).toBe(500)
  })

  it('nach Zeitlimit beim Senden: «unklar», nicht nochmals senden', () => {
    expect(versandFehler(new DienstFehler('zeitlimit', 0, ''))).toBe('ausgang.unklar')
    expect(versandFehler(new DienstFehler('sms_3', 200, ''))).toBe('sms_3')
    expect(versandFehler(new Error('konfiguration:X'))).toBe('nicht_eingerichtet')
  })
})

describe('AbaNinja', () => {
  it('liest Kunden und sucht darin', () => {
    const k = kundeLesen(
      {
        uuid: 'u1',
        first_name: 'Anna',
        last_name: 'Beispiel',
        customer_number: 592,
        contacts: [
          { type: 'phone', value: '079' },
          { type: 'email', value: 'anna@example.org', primary: true },
        ],
        addresses: [{ zip_code: '5630', city: 'Muri' }],
      },
      'person',
    )
    expect(k).toEqual({
      uuid: 'u1',
      art: 'person',
      name: 'Anna Beispiel',
      kundennummer: '592',
      email: 'anna@example.org',
      ort: '5630 Muri',
    })
    expect(passt(k, 'beisp')).toBe(true)
    expect(passt(k, '592')).toBe(true)
    expect(passt(k, '')).toBe(false)
  })

  it('baut die Adresse für AbaNinja', () => {
    const a = kundeFuerAbaninja(
      {
        art: 'person',
        anrede: 'Frau',
        vorname: 'Anna',
        nachname: 'Beispiel',
        email: 'a@b.ch',
        sprache: 'fr',
        kundennummer: 7,
        strasse: 'Rue du Lac 12a',
        plz: '1630',
        ort: 'Bulle',
      },
      { Frau: 'ms' },
    )
    expect(a).toMatchObject({
      type: 'person',
      salutation: 'ms',
      customer_number: '7',
      language: 'fr',
      contacts: [{ type: 'email', value: 'a@b.ch', primary: true }],
      addresses: [{ address: 'Rue du Lac', street_number: '12a', zip_code: '1630', city: 'Bulle', country_code: 'CH' }],
    })
    expect(kundeFuerAbaninja({ art: 'firma', firma: 'Muster AG' }, {})).toMatchObject({
      type: 'company',
      name: 'Muster AG',
      addresses: [],
    })
    expect(strasseTeilen('Bahnhofstrasse')).toEqual({ address: 'Bahnhofstrasse', street_number: '' })
  })

  it('liest Rechnungen in Rappen', () => {
    expect(
      rechnungLesen({
        uuid: 'r',
        documentNumber: 'RE-1',
        documentTotal: '12500.5',
        openAmount: 0,
        dueDate: '2026-11-30T00:00:00',
      }),
    ).toMatchObject({
      nummer: 'RE-1',
      total_rappen: 1250050,
      offen_rappen: 0,
      faellig: '2026-11-30',
    })
  })
})

describe('SharePoint und SMS', () => {
  it('Ordnernamen wie V233', () => {
    expect(kundenordner(42, 'Anna / Beispiel', 'x')).toBe('K0042 Anna - Beispiel')
    expect(sichererName('a:b*c?')).toBe('a-b-c-')
    expect(dateipfad({}, 'K0042 Anna', 'angebot', 'Offerte.pdf')).toBe(
      'Direction Interne/CRM Backups/Kunden Backup/K0042 Anna/DEVIS - ANGEBOT/Offerte.pdf',
    )
    expect(dateipfad({}, 'K1', null, 'x')).toContain('DIVERS - DIVERSES')
  })

  it('SharePoint-Link als Freigabe-Kennung', () => {
    expect(freigabeKennung('https://onedrive.live.com/redir?resid=1231244193912!12&authKey=1201919!12921!1')).toBe(
      'u!aHR0cHM6Ly9vbmVkcml2ZS5saXZlLmNvbS9yZWRpcj9yZXNpZD0xMjMxMjQ0MTkzOTEyITEyJmF1dGhLZXk9MTIwMTkxOSExMjkyMSEx',
    )
  })

  it('SMS-Absender höchstens 11 Zeichen', () => {
    expect(absenderPruefen('Dim Solaire GmbH')).toBe('DimSolaireG')
    expect(absenderPruefen('!!')).toBe('DimSolaire')
  })
})
