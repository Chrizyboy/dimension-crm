// Übersetzung zwischen CRM und Outlook (Microsoft Graph): Kalender, Termine, Mails. Nur reine Funktionen
// ohne Netz, damit sie in Node getestet werden können. Zeiten im CRM sind UTC (ISO), in Outlook Ortszeit Zürich.

export const ZEITZONE = 'Europe/Zurich'

/** Versatz von Zürich zu UTC in Minuten zu einem Zeitpunkt (Sommerzeit beachtet). */
function versatzMinuten(ms: number): number {
  const teile = new Intl.DateTimeFormat('en-US', {
    timeZone: ZEITZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms))
  const t = Object.fromEntries(teile.map((p) => [p.type, p.value]))
  const alsUtc = Date.UTC(+t.year!, +t.month! - 1, +t.day!, +t.hour!, +t.minute!, +t.second!)
  return Math.round((alsUtc - ms) / 60_000)
}

/** «2026-10-22T08:00:00(.0000000)» in Zürcher Ortszeit → UTC-ISO. */
export function zuerichZuUtc(lokal: string): string {
  const roh = Date.parse(`${lokal.slice(0, 19)}Z`)
  let ms = roh - versatzMinuten(roh) * 60_000
  ms = roh - versatzMinuten(ms) * 60_000 // zweiter Schritt für die Umstellungstage
  return new Date(ms).toISOString()
}

/** UTC-ISO → «2026-10-22T10:00:00» in Zürcher Ortszeit (für Graph mit timeZone Europe/Zurich). */
export function utcZuZuerich(iso: string): string {
  const ms = Date.parse(iso)
  return new Date(ms + versatzMinuten(ms) * 60_000).toISOString().slice(0, 19)
}

/** Ausschnitt eines Outlook-Termins (Graph event). */
export interface OutlookTermin {
  id: string
  subject?: string | null
  isAllDay?: boolean
  showAs?: string
  isCancelled?: boolean
  webLink?: string
  start: { dateTime: string; timeZone?: string }
  end: { dateTime: string; timeZone?: string }
  location?: { displayName?: string; address?: { postalCode?: string } }
}

/** Kalendereintrag im Format von kalender_abgleichen. */
export interface Kalendereintrag {
  beginn: string
  ende: string
  ganztags: boolean
  betreff: string
  ort: string
  plz: string
  anzeige_als: string
  extern_id: string
  link: string
}

const ANZEIGE = new Set(['free', 'tentative', 'busy', 'oof', 'workingElsewhere'])

/** Outlook-Termin (abgefragt mit Prefer outlook.timezone="Europe/Zurich") → Kalendereintrag. */
export function terminZuEintrag(e: OutlookTermin): Kalendereintrag | null {
  if (e.isCancelled || !e.start?.dateTime || !e.end?.dateTime) return null
  const ort = e.location?.displayName?.trim() ?? ''
  const plz = e.location?.address?.postalCode?.match(/\d{4}/)?.[0] ?? /\b([1-9]\d{3})\b/.exec(ort)?.[1] ?? ''
  const umrechnen = (d: { dateTime: string; timeZone?: string }) =>
    !d.timeZone || d.timeZone === ZEITZONE
      ? zuerichZuUtc(d.dateTime)
      : new Date(`${d.dateTime.slice(0, 19)}Z`).toISOString()
  return {
    beginn: umrechnen(e.start),
    ende: umrechnen(e.end),
    ganztags: Boolean(e.isAllDay),
    betreff: e.subject?.trim() ?? '',
    ort,
    plz,
    anzeige_als: ANZEIGE.has(e.showAs ?? '') ? e.showAs! : 'busy',
    extern_id: e.id,
    link: e.webLink ?? '',
  }
}

/** Person für eine Mail oder einen Termin. */
export interface Adresse {
  email: string
  name?: string | undefined
}

/** Adressliste aus «a@x.ch; b@y.ch» oder «a@x.ch, b@y.ch», doppelte entfernt, ungültige weggelassen. */
export function adressen(text: string | null | undefined): string[] {
  const gesehen = new Set<string>()
  return (text ?? '')
    .split(/[;,\s]+/)
    .map((a) => a.trim())
    .filter(
      (a) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a) && !gesehen.has(a.toLowerCase()) && gesehen.add(a.toLowerCase()),
    )
}

const empfaenger = (liste: string[]) => liste.map((email) => ({ emailAddress: { address: email } }))

/** Ein Lead-Termin für Outlook (V233: «PV-Anlage: Vor-Ort-Termin», showAs workingElsewhere). */
export interface TerminDaten {
  betreff: string
  html: string
  beginn: string
  dauerMin: number
  ort: string
  teilnehmer: Adresse[]
}

/** Lead-Termin → Graph event (Ortszeit Zürich). */
export function terminZuOutlook(t: TerminDaten): Record<string, unknown> {
  const ende = new Date(Date.parse(t.beginn) + Math.max(15, t.dauerMin) * 60_000).toISOString()
  return {
    subject: t.betreff,
    body: { contentType: 'HTML', content: t.html },
    start: { dateTime: utcZuZuerich(t.beginn), timeZone: ZEITZONE },
    end: { dateTime: utcZuZuerich(ende), timeZone: ZEITZONE },
    location: { displayName: t.ort },
    showAs: 'workingElsewhere',
    isReminderOn: true,
    reminderMinutesBeforeStart: 60,
    attendees: t.teilnehmer.map((p) => ({
      type: 'required',
      emailAddress: { address: p.email, ...(p.name ? { name: p.name } : {}) },
    })),
  }
}

/** Eintrag im Ausgangskorb (Ausschnitt). */
export interface AusgangMail {
  an: string
  cc?: string | null
  betreff?: string | null
  html?: string | null
  text?: string | null
}

/** Text ohne HTML in einfaches HTML (Zeilenumbrüche bleiben, Sonderzeichen geschützt). */
export function textZuHtml(text: string): string {
  const geschuetzt = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:11pt">${geschuetzt.replace(/\r?\n/g, '<br>')}</div>`
}

/** Ausgangskorb-Mail → Graph message (ohne Anhänge; die kommen einzeln dazu). */
export function mailZuOutlook(m: AusgangMail): Record<string, unknown> {
  return {
    subject: m.betreff ?? '',
    body: { contentType: 'HTML', content: m.html?.trim() ? m.html : textZuHtml(m.text ?? '') },
    toRecipients: empfaenger(adressen(m.an)),
    ccRecipients: empfaenger(adressen(m.cc)),
  }
}

/** Ausschnitt einer Outlook-Mail (Graph message). */
export interface OutlookMail {
  id: string
  internetMessageId?: string
  subject?: string | null
  bodyPreview?: string
  receivedDateTime?: string
  sentDateTime?: string
  from?: { emailAddress?: { address?: string } }
  toRecipients?: { emailAddress?: { address?: string } }[]
  ccRecipients?: { emailAddress?: { address?: string } }[]
}

/** Outlook-Mail → Format von mails_vermerken. */
export function mailZuVerlauf(m: OutlookMail) {
  const liste = (r?: { emailAddress?: { address?: string } }[]) =>
    (r ?? []).map((x) => x.emailAddress?.address?.toLowerCase() ?? '').filter(Boolean)
  return {
    kennung: m.internetMessageId ?? m.id,
    zeitpunkt: m.sentDateTime ?? m.receivedDateTime ?? null,
    von: m.from?.emailAddress?.address?.toLowerCase() ?? '',
    an: [...liste(m.toRecipients), ...liste(m.ccRecipients)],
    betreff: m.subject ?? '',
    vorschau: (m.bodyPreview ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
  }
}

/** Grösste Datei, die in einem Stück an eine Mail gehängt wird; grössere gehen über eine Upload-Sitzung. */
export const ANHANG_DIREKT_MAX = 3 * 1024 * 1024
/** Microsoft nimmt pro Mail höchstens 150 MB an; wir bleiben bei 25 MB, damit die Mail sicher ankommt. */
export const ANHAENGE_GESAMT_MAX = 25 * 1024 * 1024

/** Bytes → Base64 (für Anhänge). */
export function base64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
