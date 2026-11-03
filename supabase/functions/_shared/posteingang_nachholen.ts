// Posteingang: ältere Mails nachholen (rückwärts, Seite um Seite im Zeitplan). Eingang kommt als Archiv in den
// Posteingang (ohne Frist und ohne KI, damit «Wartet auf uns» und die Reaktionszeit nicht geflutet werden), Eingang
// und Gesendetes zusätzlich in den Kundenverlauf. Wie weit zurück: einstellungen.posteingang.nachholen_monate.

import { dienst } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { graph } from './microsoft.ts'
import { mailZuVerlauf } from './outlook.ts'
import type { MsEinstellungen } from './abgleich.ts'
import { mailZuEingang, postfachPfad, type EingangsMail } from './posteingang.ts'

const FELDER =
  'id,internetMessageId,conversationId,subject,bodyPreview,receivedDateTime,sentDateTime,webLink,hasAttachments,from,toRecipients,ccRecipients'
const SEITE = 100

type Ordner = 'inbox' | 'sentitems'

/** Älteste Zeit einer Seite (Graph liefert neueste zuerst). */
function aeltesteZeit(mails: EingangsMail[], feld: 'receivedDateTime' | 'sentDateTime'): string | null {
  let min: string | null = null
  for (const m of mails) {
    const z = m[feld]
    if (z && (!min || z < min)) min = z
  }
  return min
}

/** Eine Seite eines Ordners nachholen. Gibt false zurück, wenn der Ordner fertig ist. */
async function seiteNachholen(personId: string, postfach: string, ordner: Ordner, zaehler: { neu: number }) {
  const schluessel = postfach === 'me' ? personId : postfach
  const stand = await dienst.rpc<{ bis: string; grenze: string } | null>('posteingang_nachholen_stand', {
    p_schluessel: schluessel,
    p_ordner: ordner,
  })
  if (!stand) return false
  const feld = ordner === 'inbox' ? 'receivedDateTime' : 'sentDateTime'
  const bis = new Date(stand.bis).toISOString()
  const q = new URLSearchParams({
    // «le» statt «lt»: gleiche Zeit an der Seitengrenze geht nicht verloren (Doppelte fängt die Kennung ab).
    $filter: `${feld} le ${bis} and ${feld} ge ${new Date(stand.grenze).toISOString()}`,
    $orderby: `${feld} desc`,
    $select: FELDER,
    $top: String(SEITE),
  })
  const seite = await graph<{ value?: EingangsMail[] }>(
    personId,
    `${postfachPfad(postfach)}/mailFolders/${ordner}/messages?${q}`,
  )
  const mails = seite.value ?? []
  await dienst.rpc<number>('mails_vermerken', { p_person: personId, p_mails: mails.map(mailZuVerlauf) })
  let aelteste = aeltesteZeit(mails, feld)
  // Ganze Seite mit derselben Zeit: eine Sekunde weiter, damit es nie hängen bleibt.
  if (aelteste && new Date(aelteste).toISOString() === bis) aelteste = new Date(Date.parse(bis) - 1000).toISOString()
  zaehler.neu += await dienst.rpc<number>('posteingang_nachholen', {
    p_schluessel: schluessel,
    p_ordner: ordner,
    p_person: personId,
    p_postfach: postfach,
    p_mails: ordner === 'inbox' ? mails.map(mailZuEingang) : [],
    p_bis: aelteste,
    p_ende: mails.length < SEITE,
  })
  return mails.length >= SEITE
}

/**
 * Für eine Person nachholen, bis `bisZeit` (ms seit 1970) erreicht ist: eigenes Postfach und, wenn `mitTeam`, die
 * Team-Postfächer. Fehlt der Zugriff auf ein Team-Postfach, versucht es die nächste Person.
 */
export async function posteingangNachholen(personId: string, s: MsEinstellungen, mitTeam: boolean, bisZeit: number) {
  const zaehler = { neu: 0 }
  const team = mitTeam
    ? [...new Set([s.postfach_anfragen, ...(s.team_postfaecher ?? [])].filter((p): p is string => Boolean(p)))]
    : []
  for (const postfach of ['me', ...team]) {
    for (const ordner of ['inbox', 'sentitems'] as const) {
      try {
        while (Date.now() < bisZeit && (await seiteNachholen(personId, postfach, ordner, zaehler))) {
          /* nächste Seite */
        }
      } catch (f) {
        if (postfach !== 'me' && f instanceof DienstFehler && ['kein_zugriff', 'nicht_gefunden'].includes(f.code)) break
        throw f
      }
    }
  }
  return zaehler.neu
}
