// Abgleich mit Outlook im Hintergrund oder auf Knopfdruck: Kalender (V231), Mail-Verlauf mit Kunden (V81/V227)
// und Anfragen per Mail (V78 solar-guide.ch, Landingpage, Messe-App). Jede Person mit ihrem eigenen Zugang;
// Team-Postfächer und info@ über Stellvertretung. Fehlt der Zugriff auf ein Postfach, läuft der Rest weiter.

import { anfrageErkennen, landingpageLesen, messeLesen, messeZuAnfrage, solarGuideLesen } from './anfrage.ts'
import { dienst } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { graph, graphAlle } from './microsoft.ts'
import { mailZuVerlauf, terminZuEintrag, ZEITZONE, type OutlookMail, type OutlookTermin } from './outlook.ts'

/** Nicht geheime Einstellungen für Microsoft (Tabelle integrationen). */
export interface MsEinstellungen {
  postfach_anfragen?: string
  team_postfaecher?: string[]
  kalender_tage?: number
  mail_tage?: number
  anfragen_tage?: number
  sharepoint_website?: string
  sharepoint_bibliothek?: string
  sharepoint_ordner?: string
}

/** Einstellungen für Microsoft lesen. */
export async function msEinstellungen(): Promise<MsEinstellungen> {
  const [z] = await dienst.lies<{ einstellungen: MsEinstellungen }[]>(
    'integrationen?dienst=eq.microsoft&select=einstellungen',
  )
  return z?.einstellungen ?? {}
}

const tageZurueck = (tage: number) => new Date(Date.now() - tage * 86_400_000).toISOString()

/** Outlook-Kalender der Person (heute bis in «tage» Tagen) ins CRM übernehmen. */
export async function kalenderAbgleichen(personId: string, tage = 21): Promise<number> {
  const heute = new Date()
  heute.setUTCHours(0, 0, 0, 0)
  const von = heute.toISOString()
  const bis = new Date(heute.getTime() + tage * 86_400_000).toISOString()
  const q = new URLSearchParams({
    startDateTime: von,
    endDateTime: bis,
    $select: 'id,subject,start,end,isAllDay,showAs,isCancelled,location,webLink',
    $top: '200',
  })
  const termine = await graphAlle<OutlookTermin>(personId, `/me/calendarView?${q}`, 5, {
    Prefer: `outlook.timezone="${ZEITZONE}"`,
  })
  const eintraege = termine.map(terminZuEintrag).filter(Boolean)
  return dienst.rpc<number>('kalender_abgleichen', {
    p_person: personId,
    p_von: von,
    p_bis: bis,
    p_eintraege: eintraege,
  })
}

const MAIL_FELDER =
  'id,internetMessageId,subject,bodyPreview,receivedDateTime,sentDateTime,from,toRecipients,ccRecipients'

/** Mails der letzten «tage» Tage (eigenes Postfach und Team-Postfächer) im Kundenverlauf vermerken. */
export async function mailsAbgleichen(personId: string, tage: number, teamPostfaecher: string[] = []): Promise<number> {
  const q = new URLSearchParams({
    $filter: `receivedDateTime ge ${tageZurueck(tage)}`,
    $select: MAIL_FELDER,
    $top: '50',
  })
  let n = 0
  for (const postfach of ['/me', ...teamPostfaecher.map((p) => `/users/${encodeURIComponent(p)}`)]) {
    try {
      const mails = await graphAlle<OutlookMail>(personId, `${postfach}/messages?${q}`, 4)
      n += await dienst.rpc<number>('mails_vermerken', { p_person: personId, p_mails: mails.map(mailZuVerlauf) })
    } catch (f) {
      if (postfach === '/me' || !(f instanceof DienstFehler && ['kein_zugriff', 'nicht_gefunden'].includes(f.code)))
        throw f
    }
  }
  return n
}

/** Ergebnis des Abholens von Anfragen. */
export interface AnfragenErgebnis {
  neu: number
  ergaenzt: number
  geloescht: number
  postfach_anfragen: 'ok' | 'kein_zugriff' | 'aus'
}

type MailMitInhalt = OutlookMail & { body?: { content?: string } }

// Suchen wie V233 (sgSearch, lpImport, mxImport): direkt vom Absender, weitergeleitet und eigene Formulare.
const SUCHEN: { suche: string; passt: RegExp }[] = [
  { suche: '"from:anfrage@solar-guide.ch"', passt: /solar-?guide\.ch:\s*Anfrage von/i },
  { suche: '"solar-guide.ch: Anfrage von"', passt: /solar-?guide\.ch:\s*Anfrage von/i },
  { suche: '"Leads Landingpage"', passt: /Leads Landingpage/i },
  { suche: '"Leads Messe"', passt: /Leads Messe/i },
]

/** Liest eine Mail als Anfrage (oder als Löschmeldung der Messe-App) und übergibt sie der Datenbank. */
async function anfrageVerarbeiten(m: MailMitInhalt, e: AnfragenErgebnis): Promise<void> {
  const kennung = m.internetMessageId ?? m.id
  const betreff = (m.subject ?? '').replace(/^((WG|FW|Fwd|AW|RE|TR)\s*:\s*)+/i, '')
  const inhalt = m.body?.content ?? m.bodyPreview ?? ''
  const messe = /Leads Messe/i.test(betreff) ? messeLesen(inhalt) : null
  if (messe?.geloescht) {
    e.geloescht += await dienst.rpc<number>('messe_geloescht', { p_kennung: kennung, p_sids: messe.geloescht })
    return
  }
  const anfrage = messe?.neu
    ? messeZuAnfrage(messe.neu)
    : /Leads Landingpage/i.test(betreff)
      ? landingpageLesen(inhalt, betreff)
      : /solar-?guide/i.test(betreff)
        ? solarGuideLesen(inhalt, betreff)
        : anfrageErkennen(inhalt, betreff, m.from?.emailAddress?.address)
  if (!anfrage) {
    await dienst.rpc('anfrage_uebersprungen', { p_kennung: kennung, p_quelle: 'unbekannt' })
    return
  }
  const r = await dienst.rpc<{ ergebnis: string }>('anfrage_uebernehmen', {
    p: { ...anfrage, kennung, eingang_am: anfrage.eingang_am ?? (m.receivedDateTime ?? '').slice(0, 10) },
  })
  if (r.ergebnis === 'neu') e.neu++
  else if (r.ergebnis === 'ergaenzt') e.ergaenzt++
}

/** Anfragen aus dem eigenen Postfach und aus info@ (Stellvertretung) holen und als Leads übernehmen. */
export async function anfragenAbholen(personId: string, s: MsEinstellungen): Promise<AnfragenErgebnis> {
  const e: AnfragenErgebnis = {
    neu: 0,
    ergaenzt: 0,
    geloescht: 0,
    postfach_anfragen: s.postfach_anfragen ? 'ok' : 'aus',
  }
  const seit = tageZurueck(s.anfragen_tage ?? 14)
  const gesehen = new Set<string>()
  const postfaecher = ['/me', ...(s.postfach_anfragen ? [`/users/${encodeURIComponent(s.postfach_anfragen)}`] : [])]
  for (const postfach of postfaecher) {
    for (const { suche, passt } of SUCHEN) {
      let mails: MailMitInhalt[]
      try {
        const q = new URLSearchParams({ $search: suche, $select: `${MAIL_FELDER},body`, $top: '25' })
        mails = (await graph<{ value?: MailMitInhalt[] }>(personId, `${postfach}/messages?${q}`)).value ?? []
      } catch (f) {
        if (postfach !== '/me' && f instanceof DienstFehler && ['kein_zugriff', 'nicht_gefunden'].includes(f.code)) {
          e.postfach_anfragen = 'kein_zugriff'
          break
        }
        throw f
      }
      const passend = mails
        .filter((m) => passt.test(m.subject ?? '') && (m.receivedDateTime ?? '') >= seit)
        .sort((a, b) => (a.receivedDateTime ?? '').localeCompare(b.receivedDateTime ?? ''))
      for (const m of passend) {
        const k = m.internetMessageId ?? m.id
        if (gesehen.has(k)) continue
        gesehen.add(k)
        await anfrageVerarbeiten(m, e)
      }
    }
  }
  return e
}
