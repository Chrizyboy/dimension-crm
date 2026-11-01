// Posteingang (Phase 18): Mails aus Outlook holen (persönliches Postfach und Team-Postfächer wie info@), gesendete
// Mails als Antwort erkennen und neue Mails von der KI einordnen lassen. Regeln, Zuordnung, Fristen und Erinnerung
// stehen in der Datenbank (posteingang_*). Im CRM bleiben nur Absender, Betreff, Vorschau und Kurzfassung; der volle
// Text wird nur gelesen, um einzuordnen, und für die Person, die ihn öffnet.

import type { Teil } from './claude.ts'
import { alsPerson, dienst, type Ich } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { daten, GRUNDREGELN, kiAufruf, kiEingerichtet, kiEinstellung, type KiEinstellung } from './ki_rahmen.ts'
import { janein, kurz, liste, objekt, text, wahl } from './ki_schema.ts'
import { graph, graphAlle } from './microsoft.ts'
import type { MsEinstellungen } from './abgleich.ts'

/** Eine Mail aus Graph, mit den Feldern, die der Posteingang braucht. */
export interface EingangsMail {
  id: string
  internetMessageId?: string
  conversationId?: string
  subject?: string | null
  bodyPreview?: string
  receivedDateTime?: string
  sentDateTime?: string
  webLink?: string
  hasAttachments?: boolean
  from?: { emailAddress?: { address?: string; name?: string } }
  toRecipients?: { emailAddress?: { address?: string } }[]
  ccRecipients?: { emailAddress?: { address?: string } }[]
}

const FELDER =
  'id,internetMessageId,conversationId,subject,bodyPreview,receivedDateTime,sentDateTime,webLink,hasAttachments,from,toRecipients,ccRecipients'

const adressen = (r?: { emailAddress?: { address?: string } }[]) =>
  (r ?? []).map((x) => x.emailAddress?.address?.trim().toLowerCase() ?? '').filter(Boolean)

/** Graph-Mail → Format von posteingang_aufnehmen. */
export function mailZuEingang(m: EingangsMail) {
  return {
    kennung: m.internetMessageId ?? m.id,
    outlook_id: m.id,
    konversation: m.conversationId ?? null,
    eingang_am: m.receivedDateTime ?? null,
    von: m.from?.emailAddress?.address?.trim().toLowerCase() ?? '',
    von_name: m.from?.emailAddress?.name?.trim() ?? '',
    an: [...adressen(m.toRecipients), ...adressen(m.ccRecipients)],
    betreff: m.subject ?? '',
    vorschau: (m.bodyPreview ?? '').replace(/\s+/g, ' ').trim().slice(0, 400),
    web_link: m.webLink ?? null,
    anhang: m.hasAttachments === true,
  }
}

/** Gesendete Graph-Mail → Format von posteingang_antworten. */
export function gesendetZuAntwort(m: EingangsMail) {
  return {
    konversation: m.conversationId ?? null,
    von: m.from?.emailAddress?.address?.trim().toLowerCase() ?? '',
    an: [...adressen(m.toRecipients), ...adressen(m.ccRecipients)],
    zeitpunkt: m.sentDateTime ?? m.receivedDateTime ?? null,
  }
}

/** Pfad eines Postfachs in Graph: «me» oder ein Team-Postfach über Stellvertretung. */
export const postfachPfad = (postfach: string) => (postfach === 'me' ? '/me' : `/users/${encodeURIComponent(postfach)}`)

/** Ergebnis eines Abholens. */
export interface AbholErgebnis {
  neu: number
  beantwortet: number
  ohne_zugriff: string[]
}

/**
 * Posteingang und Gesendete eines Postfachs seit `seit` lesen. Fehlt der Zugriff auf ein Team-Postfach, wird es
 * übersprungen und gemeldet; das eigene Postfach muss gehen.
 */
async function postfachAbholen(personId: string, postfach: string, seit: string, e: AbholErgebnis): Promise<void> {
  const basis = postfachPfad(postfach)
  try {
    const ein = new URLSearchParams({
      $filter: `receivedDateTime ge ${seit}`,
      $orderby: 'receivedDateTime desc',
      $select: FELDER,
      $top: '50',
    })
    const mails = await graphAlle<EingangsMail>(personId, `${basis}/mailFolders/inbox/messages?${ein}`, 4)
    e.neu += await dienst.rpc<number>('posteingang_aufnehmen', {
      p_person: personId,
      p_postfach: postfach,
      p_mails: mails.map(mailZuEingang),
    })
    const aus = new URLSearchParams({
      $filter: `sentDateTime ge ${seit}`,
      $orderby: 'sentDateTime desc',
      $select: 'id,conversationId,sentDateTime,from,toRecipients,ccRecipients',
      $top: '50',
    })
    const gesendet = await graphAlle<EingangsMail>(personId, `${basis}/mailFolders/sentitems/messages?${aus}`, 4)
    e.beantwortet += await dienst.rpc<number>('posteingang_antworten', { p_mails: gesendet.map(gesendetZuAntwort) })
  } catch (f) {
    if (postfach !== 'me' && f instanceof DienstFehler && ['kein_zugriff', 'nicht_gefunden'].includes(f.code)) {
      e.ohne_zugriff.push(postfach)
      return
    }
    throw f
  }
}

/** Alle Postfächer einer Person holen; Team-Postfächer nur, wenn `mitTeam` (pro Lauf nur einmal nötig). */
export async function posteingangAbholen(personId: string, s: MsEinstellungen, mitTeam: boolean) {
  const e: AbholErgebnis = { neu: 0, beantwortet: 0, ohne_zugriff: [] }
  const seit = await dienst.rpc<string | null>('posteingang_seit', {})
  if (!seit) return e
  const team = mitTeam
    ? [...new Set([s.postfach_anfragen, ...(s.team_postfaecher ?? [])].filter((p): p is string => Boolean(p)))]
    : []
  for (const postfach of ['me', ...team]) await postfachAbholen(personId, postfach, new Date(seit).toISOString(), e)
  return e
}

/** Arten, die die KI wählen darf (Schlüssel wie in der Datenbank). */
export const ARTEN = [
  'anfrage',
  'stoerung',
  'kunde',
  'rechnung',
  'lieferant',
  'amt',
  'monitor',
  'sonstiges',
  'intern',
  'werbung',
  'privat',
] as const

/** Antwortformat der Einordnung. */
export const EINORDNEN_SCHEMA = objekt({
  art: wahl(ARTEN),
  sprache: wahl(['de', 'fr', 'en', 'it']),
  dringend: janein,
  antwort_noetig: janein,
  zusammenfassung: text,
  nummern: liste(text),
})

/** Systemtext und Teile für die Einordnung einer Mail (fremder Inhalt nur als Daten). */
export function einordnenTeile(m: { von: string; betreff: string; text: string; kunde: string | null }): Teil[] {
  return [
    { art: 'text', text: daten('mail', { von: m.von, betreff: m.betreff, bekannter_kunde: m.kunde, text: m.text }) },
    {
      art: 'text',
      text: `AUFGABE: Ordne die eingegangene E-Mail für den Posteingang ein.
«art»: anfrage = jemand interessiert sich neu für eine Anlage oder will eine Offerte; stoerung = Anlage, Wechselrichter, Batterie, Wärmepumpe oder Ladestation funktioniert nicht oder zeigt Fehler; kunde = Frage, Rückmeldung, Terminwunsch oder Unterlagen eines Kunden oder Interessenten zu Offerte, Projekt oder Montage; rechnung = Frage zu einer Rechnung, Zahlung, Mahnung oder eine Lieferantenrechnung; lieferant = Auftragsbestätigung, Lieferung, Preisliste eines Lieferanten; amt = Gemeinde, Kanton, Netzbetreiber, Pronovo, Versicherung; monitor = Ausschreibung oder Baugesuch-Hinweis; werbung = Newsletter, Werbung, automatische Mitteilung ohne Handlungsbedarf; privat = rein private Mail ohne Bezug zur Firma; intern = Mitarbeitende untereinander; sonstiges = alles andere.
«antwort_noetig»: true, wenn der Absender eine Antwort oder Rückmeldung von uns erwartet.
«dringend»: true nur bei Stillstand, Gefahr, Schaden oder ausdrücklich dringender Bitte.
«zusammenfassung»: ein bis zwei kurze Sätze in der Sprache der Mail, was der Absender will (ohne Grussformeln).
«nummern»: Offerten-, Projekt-, Rechnungs-, Bestell-, Lead- oder Service-Nummern genau wie in der Mail (z. B. «R2026-118», «S014»), sonst eine leere Liste.`,
    },
  ]
}

const SYSTEM = `${GRUNDREGELN}
Du sortierst eingehende E-Mails. Unbekanntes ist «sonstiges». Rate nie.`

/** Volltext einer Mail als Text (uniqueBody: nur der neue Teil, ohne zitierte Vorgänger-Mails). */
async function mailText(personId: string, postfach: string, outlookId: string, ganz = false): Promise<string> {
  const feld = ganz ? 'body' : 'uniqueBody'
  const m = await graph<{ body?: { content?: string }; uniqueBody?: { content?: string } }>(
    personId,
    `${postfachPfad(postfach)}/messages/${encodeURIComponent(outlookId)}?$select=${feld}`,
    { koepfe: { Prefer: 'outlook.body-content-type="text"' } },
  )
  return (m[feld]?.content ?? '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface Unsortiert {
  id: string
  abgeholt_von: string
  postfach: string
  outlook_id: string
  von_email: string | null
  von_name: string | null
  betreff: string | null
  vorschau: string | null
  kunde: string | null
}

/**
 * Neue Mails einordnen. Ohne KI-Schlüssel, bei ausgeschalteter KI oder erreichtem Tageslimit gilt eine einfache
 * Regel (bekannter Kunde = Kunde mit Antwortfrist, sonst «sonstiges»), damit nichts liegen bleibt.
 */
export async function posteingangEinordnen(limit = 15): Promise<string> {
  const offen = await dienst.rpc<Unsortiert[]>('posteingang_unsortiert', { p_limit: limit })
  if (!offen.length) return '0 eingeordnet'
  let cfg: KiEinstellung | null = kiEingerichtet() ? await kiEinstellung() : null
  let ki = 0
  let regel = 0
  for (const m of offen) {
    let ergebnis: Record<string, unknown> | null = null
    if (cfg?.aktiv) {
      try {
        const inhalt = await mailText(m.abgeholt_von, m.postfach, m.outlook_id).catch(() => m.vorschau ?? '')
        const r = await kiAufruf(
          { funktion: 'posteingang', personId: null, bezugTabelle: 'posteingang', bezugId: m.id },
          cfg,
          {
            system: SYSTEM,
            teile: einordnenTeile({
              von: [m.von_name, m.von_email].filter(Boolean).join(' '),
              betreff: m.betreff ?? '',
              text: (inhalt || m.vorschau || '').slice(0, 6000),
              kunde: m.kunde,
            }),
            schema: EINORDNEN_SCHEMA,
            maxTokens: 800,
          },
        )
        const j = r.json as Record<string, unknown>
        ergebnis = { ...j, zusammenfassung: kurz(j.zusammenfassung, 600) }
        ki++
      } catch (f) {
        // Limit erreicht oder KI aus: für den Rest dieses Laufs nur noch die Regel.
        if (f instanceof DienstFehler && ['ki_limit', 'ki_aus', 'ki_modell'].includes(f.code)) cfg = null
      }
    }
    if (!ergebnis) {
      ergebnis = { art: m.kunde ? 'kunde' : 'sonstiges', antwort_noetig: Boolean(m.kunde), ohne_ki: true }
      regel++
    }
    await dienst.rpc('posteingang_sortieren', { p_id: m.id, p: ergebnis })
  }
  return `${ki} mit KI, ${regel} nach Regel`
}

/** Volltext für die App: nur wer die Mail sehen darf (RLS), gelesen mit dem Zugang, der sie abgeholt hat. */
export async function posteingangText(ich: Ich, id: string): Promise<{ text: string }> {
  const [z] = await alsPerson(ich).lies<{ abgeholt_von: string; postfach: string; outlook_id: string }[]>(
    `posteingang?id=eq.${encodeURIComponent(id)}&select=abgeholt_von,postfach,outlook_id`,
  )
  if (!z) throw new DienstFehler('nicht_gefunden', 404, 'Mail')
  return { text: (await mailText(z.abgeholt_von, z.postfach, z.outlook_id, true)).slice(0, 60_000) }
}
