// Posteingang › Mail-Akte: ganze Unterhaltung und Anhänge einer Mail aus Outlook, beim Öffnen gelesen (im CRM bleibt
// nur der Kopf, Entscheid 0033). Gelesen wird mit dem Zugang, der die Mail abgeholt hat; ob die Person die Mail sehen
// darf, prüft die Datenbank (RLS) über alsPerson. Ein Anhang kann ins CRM übernommen werden (Bucket «dokumente»,
// Zeile in «dokumente» mit Bezug); Offerten und Projekte legt der Zeitplan danach in die SharePoint-Ablage.

import { alsPerson, dienst, type Ich } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { graph } from './microsoft.ts'
import { postfachPfad } from './posteingang.ts'

interface Kopf {
  abgeholt_von: string
  postfach: string
  outlook_id: string
  konversation_id: string | null
  von_email: string | null
}

/** Kopf einer Mail, nur wenn ich sie sehen darf. */
async function kopf(ich: Ich, id: string): Promise<Kopf> {
  const [z] = await alsPerson(ich).lies<Kopf[]>(
    `posteingang?id=eq.${encodeURIComponent(id)}&select=abgeholt_von,postfach,outlook_id,konversation_id,von_email`,
  )
  if (!z) throw new DienstFehler('nicht_gefunden', 404, 'Mail')
  return z
}

/** Eine Mail der Unterhaltung, wie die App sie zeigt. */
export interface VerlaufMail {
  id: string
  von: string
  von_name: string
  zeit: string
  wir: boolean
  text: string
}

interface GraphVerlauf {
  id: string
  from?: { emailAddress?: { address?: string; name?: string } }
  receivedDateTime?: string
  sentDateTime?: string
  uniqueBody?: { content?: string }
  bodyPreview?: string
  isDraft?: boolean
}

const sauber = (t: string) =>
  t
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/**
 * Alle Mails derselben Unterhaltung (Eingang und Gesendet, alle Ordner), älteste zuerst, höchstens 25, je nur der neue
 * Teil (ohne zitierte Vorgänger). «wir» = Absender ist nicht der Absender der Kundenmail (also wir).
 */
export async function posteingangVerlauf(ich: Ich, id: string): Promise<{ mails: VerlaufMail[] }> {
  const k = await kopf(ich, id)
  if (!k.konversation_id) return { mails: [] }
  const filter = encodeURIComponent(`conversationId eq '${k.konversation_id.replace(/'/g, "''")}'`)
  const seite = await graph<{ value?: GraphVerlauf[] }>(
    k.abgeholt_von,
    `${postfachPfad(k.postfach)}/messages?$filter=${filter}&$select=id,from,receivedDateTime,sentDateTime,uniqueBody,bodyPreview,isDraft&$top=25`,
    { koepfe: { Prefer: 'outlook.body-content-type="text"' } },
  )
  const kunde = (k.von_email ?? '').toLowerCase()
  const mails = (seite.value ?? [])
    .filter((m) => !m.isDraft)
    .map((m) => {
      const von = (m.from?.emailAddress?.address ?? '').toLowerCase()
      return {
        id: m.id,
        von,
        von_name: m.from?.emailAddress?.name ?? von,
        zeit: m.sentDateTime ?? m.receivedDateTime ?? '',
        wir: Boolean(kunde) && von !== kunde,
        text: sauber(m.uniqueBody?.content ?? m.bodyPreview ?? '').slice(0, 20_000),
      }
    })
    .sort((a, b) => a.zeit.localeCompare(b.zeit))
  return { mails }
}

/** Ein Anhang, wie die App ihn zeigt. */
export interface Anhang {
  id: string
  name: string
  groesse: number
  typ: string
}

interface GraphAnhang {
  id: string
  name?: string
  size?: number
  contentType?: string
  isInline?: boolean
  contentBytes?: string
  '@odata.type'?: string
}

/** Anhänge einer Mail (ohne eingebettete Bilder der Signatur). */
export async function posteingangAnhaenge(ich: Ich, id: string): Promise<{ anhaenge: Anhang[] }> {
  const k = await kopf(ich, id)
  const seite = await graph<{ value?: GraphAnhang[] }>(
    k.abgeholt_von,
    `${postfachPfad(k.postfach)}/messages/${encodeURIComponent(k.outlook_id)}/attachments?$select=id,name,size,contentType,isInline`,
  )
  return {
    anhaenge: (seite.value ?? [])
      .filter((a) => !a.isInline && (a['@odata.type'] ?? '#microsoft.graph.fileAttachment').endsWith('fileAttachment'))
      .map((a) => ({
        id: a.id,
        name: a.name ?? 'Anhang',
        groesse: a.size ?? 0,
        typ: a.contentType ?? 'application/octet-stream',
      })),
  }
}

const MAX_BYTES = 25 * 1024 * 1024

/** Einen Anhang lesen (Name, Typ, Inhalt). */
async function anhangLesen(ich: Ich, id: string, anhangId: string) {
  const k = await kopf(ich, id)
  const a = await graph<GraphAnhang>(
    k.abgeholt_von,
    `${postfachPfad(k.postfach)}/messages/${encodeURIComponent(k.outlook_id)}/attachments/${encodeURIComponent(anhangId)}`,
  )
  if (!a.contentBytes) throw new DienstFehler('anhang_fehlt', 404, 'Anhang')
  if ((a.size ?? 0) > MAX_BYTES) throw new DienstFehler('anhang_zu_gross', 413, 'Anhang')
  return { name: a.name ?? 'Anhang', typ: a.contentType ?? 'application/octet-stream', base64: a.contentBytes }
}

/** Anhang zum Öffnen in der App (als Base64, höchstens 25 MB). */
export const posteingangAnhang = anhangLesen

/** Wohin ein Anhang darf (Bezug in «dokumente», Ordner für die Ablage). */
const ZIELE: Record<string, string> = {
  kontakte: 'mail',
  verkaufschancen: 'mail',
  offerten: 'angebot',
  projekte: 'mail',
  service_faelle: 'service',
  rechnungen: 'beleg',
  bestellungen: 'beleg',
  kreditor_zahlungen: 'beleg',
}

const sichererName = (n: string) => n.replace(/[^\p{L}\p{N}._ -]+/gu, '_').slice(0, 120) || 'Anhang'

/**
 * Anhang ins CRM übernehmen: Datei in den privaten Speicher, Zeile in «dokumente» mit Bezug (Kunde, Lead, Offerte,
 * Projekt, Service-Fall, Rechnung, Bestellung, Zahlung). Der Bezug muss zur Mail gehören (gleiche Akte) oder die
 * Person muss ihn lesen dürfen; das prüft die Datenbank über alsPerson.
 */
export async function posteingangAnhangAblegen(
  ich: Ich,
  id: string,
  anhangId: string,
  tabelle: string,
  bezugId: string,
): Promise<{ dokument_id: string; name: string }> {
  const ordner = ZIELE[tabelle]
  if (!ordner) throw new DienstFehler('eingabe', 400, 'Ziel')
  const [ziel] = await alsPerson(ich).lies<{ id: string }[]>(
    `${tabelle}?id=eq.${encodeURIComponent(bezugId)}&select=id`,
  )
  if (!ziel) throw new DienstFehler('nicht_gefunden', 404, 'Ziel')
  const a = await anhangLesen(ich, id, anhangId)
  const bytes = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0))
  const name = sichererName(a.name)
  const pfad = `posteingang/${bezugId}/${String(Date.now())}-${name}`
  await dienst.hochladen('dokumente', pfad, bytes, a.typ)
  const dokumentId = crypto.randomUUID()
  await dienst.schreibe('dokumente', {
    id: dokumentId,
    name,
    mime_typ: a.typ,
    bytes: bytes.byteLength,
    ordner,
    speicher: 'intern',
    speicher_pfad: pfad,
    bezug_tabelle: tabelle,
    bezug_id: bezugId,
    hochgeladen_von: ich.email,
    hochgeladen_am: new Date().toISOString(),
  })
  return { dokument_id: dokumentId, name }
}
