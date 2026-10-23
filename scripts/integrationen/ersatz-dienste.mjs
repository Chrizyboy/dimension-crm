// Ersatz-Server für Microsoft (Anmeldung + Graph), ASPSMS und AbaNinja – nur für Tests. Er antwortet wie die
// echten Dienste (soweit das CRM sie nutzt) und merkt sich jeden Aufruf, damit der Test prüfen kann, was
// gesendet wurde. Ersetzt NICHT den Test mit echten Konten (siehe docs/integrationen.md).

import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'

const b64url = (b) => Buffer.from(b).toString('base64url')

/**
 * Startet den Ersatz-Server.
 * @param {{ port: number, tenant: string, email: string }} o
 */
export function starteErsatz({ port, tenant, email }) {
  const z = {
    aufrufe: [],
    codes: new Map(), // code → { challenge, redirect }
    refresh: new Set(),
    events: new Map(),
    gesendet: [],
    entwuerfe: new Map(),
    sms: [],
    aba: {
      personen: [
        {
          uuid: 'aba-1',
          first_name: 'Anna',
          last_name: 'Ersatz',
          customer_number: '9001',
          contacts: [{ type: 'email', value: 'anna@ersatz.test', primary: true }],
          addresses: [],
        },
      ],
      neu: [],
      geaendert: [],
      rechnungen: [],
    },
    hochgeladen: [],
    mails: [],
    anfragen: [],
  }
  const zugang = 'zugang-' + randomUUID()

  const json = (res, status, daten) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(daten))
  }
  const lies = (req) =>
    new Promise((ok) => {
      const teile = []
      req.on('data', (c) => teile.push(c))
      req.on('end', () => ok(Buffer.concat(teile)))
    })

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const roh = await lies(req)
    const text = roh.toString('utf8')
    z.aufrufe.push(`${req.method} ${url.pathname}`)
    const p = url.pathname

    // --- Microsoft-Anmeldung -----------------------------------------------------------------------------
    if (p.endsWith('/oauth2/v2.0/authorize')) {
      const code = 'code-' + randomUUID()
      z.codes.set(code, {
        challenge: url.searchParams.get('code_challenge'),
        redirect: url.searchParams.get('redirect_uri'),
      })
      const ziel = new URL(url.searchParams.get('redirect_uri'))
      ziel.searchParams.set('code', code)
      ziel.searchParams.set('state', url.searchParams.get('state'))
      res.writeHead(302, { Location: ziel.toString() })
      return res.end()
    }
    if (p.endsWith('/oauth2/v2.0/token')) {
      const f = new URLSearchParams(text)
      if (!f.get('client_secret')) return json(res, 401, { error: 'invalid_client' })
      if (f.get('grant_type') === 'authorization_code') {
        const c = z.codes.get(f.get('code'))
        const pruef = b64url(
          createHash('sha256')
            .update(f.get('code_verifier') ?? '')
            .digest(),
        )
        if (!c || c.challenge !== pruef || c.redirect !== f.get('redirect_uri'))
          return json(res, 400, { error: 'invalid_grant' })
        z.codes.delete(f.get('code'))
      } else if (!z.refresh.has(f.get('refresh_token'))) return json(res, 400, { error: 'invalid_grant' })
      const neu = 'refresh-' + randomUUID()
      z.refresh.add(neu)
      const id = `${b64url('{}')}.${b64url(JSON.stringify({ preferred_username: email, tid: tenant }))}.x`
      return json(res, 200, {
        access_token: zugang,
        refresh_token: neu,
        expires_in: 3600,
        id_token: id,
        scope: f.get('scope'),
      })
    }

    // --- Microsoft Graph ---------------------------------------------------------------------------------
    if (p.startsWith('/graph/')) {
      if (req.headers.authorization !== `Bearer ${zugang}`)
        return json(res, 401, { error: { code: 'InvalidAuthenticationToken' } })
      const g = p.slice('/graph'.length)
      const daten = text && req.headers['content-type']?.includes('json') ? JSON.parse(text) : null
      if (g === '/me') return json(res, 200, { mail: email, userPrincipalName: email })
      if (g === '/me/calendarView') {
        return json(res, 200, {
          value: [
            {
              id: 'ol-1',
              subject: 'Teamsitzung',
              start: {
                dateTime: `${url.searchParams.get('startDateTime').slice(0, 10)}T08:00:00.0000000`,
                timeZone: 'Europe/Zurich',
              },
              end: {
                dateTime: `${url.searchParams.get('startDateTime').slice(0, 10)}T09:00:00.0000000`,
                timeZone: 'Europe/Zurich',
              },
              showAs: 'busy',
              location: { displayName: 'Büro Muri, 5630 Muri' },
            },
            {
              id: 'ol-2',
              subject: 'Ferien',
              isAllDay: true,
              start: {
                dateTime: `${url.searchParams.get('startDateTime').slice(0, 10)}T00:00:00.0000000`,
                timeZone: 'Europe/Zurich',
              },
              end: {
                dateTime: `${url.searchParams.get('startDateTime').slice(0, 10)}T23:59:00.0000000`,
                timeZone: 'Europe/Zurich',
              },
              showAs: 'oof',
            },
            {
              id: 'ol-3',
              subject: 'Abgesagt',
              isCancelled: true,
              start: { dateTime: '2026-01-01T08:00:00' },
              end: { dateTime: '2026-01-01T09:00:00' },
            },
          ],
        })
      }
      if (g === '/me/events' && req.method === 'POST') {
        const id = 'ev-' + randomUUID()
        z.events.set(id, daten)
        return json(res, 201, { id, webLink: `https://outlook.ersatz/${id}` })
      }
      const ev = /^\/me\/events\/([^/]+)(\/cancel)?$/.exec(g)
      if (ev) {
        const id = decodeURIComponent(ev[1])
        if (!z.events.has(id)) return json(res, 404, { error: { code: 'ErrorItemNotFound' } })
        if (req.method === 'PATCH') {
          z.events.set(id, { ...z.events.get(id), ...daten })
          return json(res, 200, { id, webLink: `https://outlook.ersatz/${id}` })
        }
        z.events.delete(id)
        res.writeHead(ev[2] ? 202 : 204)
        return res.end()
      }
      if (g === '/me/messages' && req.method === 'POST') {
        const id = 'msg-' + randomUUID()
        z.entwuerfe.set(id, { ...daten, anhaenge: [], internetMessageId: `<${id}@ersatz>` })
        return json(res, 201, { id, internetMessageId: `<${id}@ersatz>` })
      }
      const m = /^\/me\/messages\/([^/]+)\/(attachments|send)$/.exec(g)
      if (m) {
        const e = z.entwuerfe.get(m[1])
        if (!e) return json(res, 404, { error: { code: 'ErrorItemNotFound' } })
        if (m[2] === 'attachments') {
          e.anhaenge.push({ name: daten.name, bytes: Buffer.from(daten.contentBytes, 'base64').length })
          return json(res, 201, { id: 'att' })
        }
        z.gesendet.push(e)
        z.entwuerfe.delete(m[1])
        res.writeHead(202)
        return res.end()
      }
      if (/^\/(me|users\/[^/]+)\/messages$/.test(g) && req.method === 'GET') {
        const postfach = g.startsWith('/me') ? 'me' : decodeURIComponent(g.split('/')[2])
        if (postfach === 'gesperrt@ersatz.test') return json(res, 403, { error: { code: 'ErrorAccessDenied' } })
        const suche = url.searchParams.get('$search')
        if (suche)
          return json(res, 200, { value: z.anfragen.filter((a) => a.postfach === postfach && suche.includes(a.suche)) })
        return json(res, 200, { value: z.mails.filter((a) => a.postfach === postfach) })
      }
      if (g.startsWith('/sites/') && g.endsWith('/drives'))
        return json(res, 200, {
          value: [
            { id: 'drive-admin', name: 'Administration' },
            { id: 'drive-pub', name: 'Public' },
          ],
        })
      if (g.startsWith('/sites/')) return json(res, 200, { id: 'site-1' })
      const up = /^\/drives\/([^/]+)\/root:\/(.+):\/content$/.exec(g)
      if (up && req.method === 'PUT') {
        const pfad = decodeURIComponent(up[2])
        z.hochgeladen.push({ pfad, bytes: roh.length })
        return json(res, 201, {
          id: 'item-' + z.hochgeladen.length,
          webUrl: `https://sharepoint.ersatz/${encodeURI(pfad)}`,
        })
      }
      return json(res, 404, { error: { code: 'NichtNachgebaut', message: g } })
    }

    // --- ASPSMS ------------------------------------------------------------------------------------------
    if (p === '/sms/CheckCredits') return json(res, 200, { StatusCode: '1', StatusInfo: 'OK', Credits: '123.5' })
    if (p === '/sms/SendSimpleTextSMS') {
      const d = JSON.parse(text)
      if (!d.UserName || !d.Password) return json(res, 200, { StatusCode: '3', StatusInfo: 'Authorization failed' })
      z.sms.push({ an: d.Recipients, text: d.MessageText, absender: d.Originator })
      return json(res, 200, { StatusCode: '1', StatusInfo: 'OK' })
    }

    // --- AbaNinja ----------------------------------------------------------------------------------------
    if (p.startsWith('/aba/accounts/')) {
      if (req.headers.authorization !== 'Bearer aba-token') return json(res, 401, { message: 'Unauthenticated' })
      const a = p.replace(/^\/aba\/accounts\/[^/]+/, '')
      if (a === '/addresses/v2/persons') return json(res, 200, { data: z.aba.personen })
      if (a === '/addresses/v2/companies') return json(res, 200, { data: [] })
      const einzel = /^\/addresses\/v2\/(persons|companies)\/(.+)$/.exec(a)
      if (einzel) {
        const k = z.aba.personen.find((x) => x.uuid === decodeURIComponent(einzel[2]))
        if (!k || einzel[1] !== 'persons') return json(res, 404, { message: 'Not found' })
        if (req.method === 'PATCH') {
          Object.assign(k, JSON.parse(text))
          z.aba.geaendert.push(k.uuid)
        }
        return json(res, 200, { data: k })
      }
      if (a === '/addresses/v2/addresses' && req.method === 'POST') {
        const d = JSON.parse(text)
        if (d.type === 'person' && (!d.last_name || !d.salutation)) return json(res, 422, { message: 'invalid' })
        const neu = { uuid: 'aba-' + randomUUID(), ...d }
        z.aba.personen.push(neu)
        z.aba.neu.push(neu)
        return json(res, 201, { data: neu })
      }
      // Rechnungen (API v2: data.documents); neue Entwürfe erscheinen in der Liste, damit der Abgleich sie findet.
      if (a === '/documents/v2/invoices' && req.method === 'POST') {
        const d = JSON.parse(text).documents?.[0]
        if (!d?.receiver?.customerNumber || !Array.isArray(d.positions) || !d.reference)
          return json(res, 422, { message: 'invalid' })
        const summe = d.positions.reduce((s, x) => s + x.singlePrice * x.quantity, 0)
        const total = d.pricesIncludeVat ? summe : summe * (1 + d.positions[0].vat.percentage / 100)
        const neu = {
          uuid: 'inv-' + randomUUID(),
          systemInvoiceNumber: 'RE-2026-' + (100 + z.aba.rechnungen.length),
          reference: d.reference,
          title: d.title,
          invoiceDate: d.invoiceDate,
          dueDate: d.dueDate,
          documentTotal: Math.round(total * 100) / 100,
          openAmount: Math.round(total * 100) / 100,
          status: 'draft',
          receiver: { customerNumber: d.receiver.customerNumber },
          positions: d.positions,
        }
        z.aba.rechnungen.push(neu)
        return json(res, 201, { data: { documents: [neu] } })
      }
      if (a === '/documents/v2/invoices') {
        return json(res, 200, {
          data: {
            documents: [
              {
                uuid: 'inv-1',
                systemInvoiceNumber: 'RE-2026-001',
                invoiceDate: '2026-10-01',
                dueDate: '2026-10-31',
                documentTotal: 12500,
                openAmount: 2500,
                status: 'open',
                receiver: { personUuid: 'aba-1' },
              },
              {
                uuid: 'inv-2',
                systemInvoiceNumber: 'RE-2026-002',
                invoiceDate: '2026-09-01',
                documentTotal: 99,
                openAmount: 0,
                status: 'paid',
                receiver: { personUuid: 'anderer' },
              },
              ...z.aba.rechnungen,
            ],
          },
        })
      }
      if (a === '/documents/v2/receipts') {
        return json(res, 200, {
          data: {
            documents: [
              {
                uuid: 'beleg-ersatz-1',
                receiptNumber: 'K-2026-77',
                reference: z.aba.belegReferenz ?? 'Lager',
                title: 'Module und Wechselrichter',
                invoiceDate: '2026-10-05',
                dueDate: '2026-11-04',
                documentTotal: 10810,
                openAmount: 10810,
                isCancelled: false,
                isArchived: false,
                receiver: { receiverInformation: { companyName: 'Ersatz Grosshandel AG' } },
              },
            ],
          },
        })
      }
    }
    json(res, 404, { fehler: 'nicht nachgebaut', pfad: p })
  })
  return new Promise((ok) => server.listen(port, '0.0.0.0', () => ok({ zustand: z, stopp: () => server.close() })))
}
