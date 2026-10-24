// Gemeinsame Hilfen der Edge Function «ki»: Eingaben prüfen, Auswahllisten und Anhänge laden, Ergebnisse speichern,
// Namen aus Beispieltexten entfernen.

import type { Teil } from '../_shared/claude.ts'
import { alsPerson, dienst, type Ich } from '../_shared/datenbank.ts'
import { DienstFehler } from '../_shared/http.ts'
import type { Auswahlen } from '../_shared/ki_lesen.ts'

export type Sprache = 'de' | 'fr'

/** Bezüge, zu denen die KI Kontext lesen darf. */
export const BEZUEGE = ['kontakte', 'verkaufschancen', 'offerten', 'projekte', 'service_faelle'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** UUID aus der Eingabe (sonst Fehler «eingabe»). */
export function idFeld(e: Record<string, unknown>, name: string): string {
  const w = e[name]
  if (typeof w !== 'string' || !UUID.test(w)) throw new DienstFehler('eingabe', 400, name)
  return w
}

/** Bezug { tabelle, id } aus der Eingabe; ohne Angabe null. */
export function bezugFeld(e: Record<string, unknown>): { tabelle: string; id: string } | null {
  if (e.tabelle === undefined && e.id === undefined) return null
  if (typeof e.tabelle !== 'string' || !(BEZUEGE as readonly string[]).includes(e.tabelle)) {
    throw new DienstFehler('eingabe', 400, 'tabelle')
  }
  return { tabelle: e.tabelle, id: idFeld(e, 'id') }
}

/** Sprache aus der Eingabe, sonst die Rückfallsprache. */
export function spracheFeld(e: Record<string, unknown>, rueckfall: string | null | undefined = 'de'): Sprache {
  const w = e.sprache === 'de' || e.sprache === 'fr' ? e.sprache : rueckfall
  return w === 'fr' ? 'fr' : 'de'
}

/** Freier Text aus der Eingabe, gekürzt; fehlt er, leer. */
export function frei(e: Record<string, unknown>, name: string, max = 4000): string {
  const w = e[name]
  return typeof w === 'string' ? w.trim().slice(0, max) : ''
}

/** Heute in Zürich als JJJJ-MM-TT. */
export function heute(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date())
}

/** Abstand der Schweizer Zeit zu UTC in Minuten für einen Zeitpunkt (60 im Winter, 120 im Sommer). */
function zuerichVersatz(zeit: number): number {
  const teil = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', timeZoneName: 'longOffset' })
    .formatToParts(new Date(zeit))
    .find((t) => t.type === 'timeZoneName')?.value
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(teil ?? '')
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
}

/**
 * Beginn des heutigen Schweizer Tages als UTC-Zeitpunkt (ISO). Nötig, weil zwischen Mitternacht und 1 bzw. 2 Uhr
 * der Schweizer Tag schon begonnen hat, der UTC-Tag aber noch nicht; zweimal gerechnet wegen der Zeitumstellung.
 */
export function tagesbeginn(tag = heute()): string {
  const mitternachtUtc = Date.parse(`${tag}T00:00:00Z`)
  const erst = mitternachtUtc - zuerichVersatz(mitternachtUtc) * 60_000
  return new Date(mitternachtUtc - zuerichVersatz(erst) * 60_000).toISOString()
}

const BILDER = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Datei aus der App (Base64), höchstens 5 MB: Bild oder PDF. */
export function dateiFeld(e: Record<string, unknown>): Teil {
  const d = e.datei as { typ?: unknown; base64?: unknown } | undefined
  if (!d || typeof d.base64 !== 'string' || typeof d.typ !== 'string') throw new DienstFehler('eingabe', 400, 'datei')
  if (d.base64.length > 7_000_000) throw new DienstFehler('datei_zu_gross', 413, 'datei')
  if (d.typ === 'application/pdf') return { art: 'pdf', base64: d.base64 }
  if (BILDER.includes(d.typ)) return { art: 'bild', typ: d.typ, base64: d.base64 }
  throw new DienstFehler('datei_typ', 415, 'datei')
}

/** Bytes als Base64 (in Stücken, damit grosse Dateien den Stapel nicht sprengen). */
export function base64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

interface DokumentZeile {
  id: string
  name: string
  mime_typ: string | null
  bytes: number | null
  ordner: string | null
  speicher: string
  speicher_pfad: string | null
}

/** Ein Dokument laden, das die Person sehen darf (RLS), als Bild- oder PDF-Teil. */
export async function dokumentTeil(ich: Ich, id: string): Promise<{ teil: Teil; zeile: DokumentZeile }> {
  const [z] = await alsPerson(ich).lies<DokumentZeile[]>(
    `dokumente?id=eq.${id}&geloescht_am=is.null&select=id,name,mime_typ,bytes,ordner,speicher,speicher_pfad`,
  )
  if (!z || z.speicher !== 'intern' || !z.speicher_pfad) throw new DienstFehler('datei_fehlt', 404, 'dokument')
  if ((z.bytes ?? 0) > 5_000_000) throw new DienstFehler('datei_zu_gross', 413, 'dokument')
  const bytes = await dienst.datei('dokumente', z.speicher_pfad)
  const typ = z.mime_typ ?? ''
  if (typ === 'application/pdf') return { teil: { art: 'pdf', base64: base64(bytes) }, zeile: z }
  if (BILDER.includes(typ)) return { teil: { art: 'bild', typ, base64: base64(bytes) }, zeile: z }
  throw new DienstFehler('datei_typ', 415, 'dokument')
}

/** Ordner zuerst, die für Kundentexte am meisten sagen (V233 aiFolderOrder). */
const ORDNER = ['angebot', 'plaene', 'bilder', 'luftbild', 'korrespondenz', 'bewilligungen', 'werkvertrag']

/**
 * Anhänge eines Bezugs für einen Entwurf (V233 «Anhänge lesen»): höchstens 4 PDF oder Bilder bis je 4 MB,
 * aus dem Bezug und dem Kunden. Was nicht lesbar ist, wird übersprungen und genannt.
 */
export async function anhaengeLaden(
  ich: Ich,
  ids: string[],
): Promise<{ teile: Teil[]; gelesen: string[]; uebersprungen: string[] }> {
  const liste = await alsPerson(ich).lies<DokumentZeile[]>(
    `dokumente?bezug_id=in.(${ids.join(',')})&geloescht_am=is.null&speicher=eq.intern` +
      '&select=id,name,mime_typ,bytes,ordner,speicher,speicher_pfad&order=erstellt_am.desc&limit=40',
  )
  const rang = (d: DokumentZeile) => {
    const i = ORDNER.indexOf(d.ordner ?? '')
    return i < 0 ? 99 : i
  }
  const teile: Teil[] = []
  const gelesen: string[] = []
  const uebersprungen: string[] = []
  for (const d of [...liste].sort((a, b) => rang(a) - rang(b))) {
    const lesbar = d.mime_typ === 'application/pdf' || BILDER.includes(d.mime_typ ?? '')
    if (!lesbar || (d.bytes ?? 0) > 4_000_000 || teile.length >= 4 || !d.speicher_pfad) {
      uebersprungen.push(d.name)
      continue
    }
    try {
      const { teil } = await dokumentTeil(ich, d.id)
      teile.push({ art: 'text', text: `Anhang «${d.name}»${d.ordner ? ` (Ordner ${d.ordner})` : ''}:` }, teil)
      gelesen.push(d.name)
    } catch {
      uebersprungen.push(d.name)
    }
  }
  return { teile, gelesen, uebersprungen }
}

/** Auswahllisten für Schemas (nur aktive Werte; «aenderung» schreibt nur das System). */
export async function auswahlen(): Promise<Auswahlen> {
  const z = await dienst.lies<{ liste: string; schluessel: string }[]>(
    'auswahlwerte?liste=in.(interesse,gebaeudeart,dachform,aktivitaet,kontaktergebnis)&aktiv=is.true' +
      '&geloescht_am=is.null&select=liste,schluessel&order=reihenfolge',
  )
  const von = (l: string) => z.filter((x) => x.liste === l).map((x) => x.schluessel)
  return {
    interesse: von('interesse'),
    gebaeudeart: von('gebaeudeart'),
    dachform: von('dachform'),
    aktivitaet: von('aktivitaet').filter((a) => a !== 'aenderung'),
    kontaktergebnis: von('kontaktergebnis'),
  }
}

/** Ergebnis speichern (Zusammenfassung, Lead-Bewertung, Briefing, Luftbild), damit es sichtbar bleibt. */
export async function speichereErgebnis(
  art: string,
  bezugTabelle: string,
  bezugId: string,
  personId: string,
  sprache: Sprache,
  inhalt: unknown,
  modell: string,
): Promise<void> {
  await dienst.schreibe('ki_ergebnisse', {
    art,
    bezug_tabelle: bezugTabelle,
    bezug_id: bezugId,
    person_id: personId,
    sprache,
    inhalt,
    modell,
  })
}

/** Namen, Adressen, Mail und Telefon des Kunden aus einem Beispieltext entfernen (V233 aisAnon). */
export function anonymisiere(text: string, kontext: unknown): string {
  const k = (kontext ?? {}) as {
    kunde?: Record<string, unknown>
    objekte?: { strasse?: unknown }[]
  }
  const woerter: string[] = []
  for (const f of ['vorname', 'nachname', 'firma']) {
    for (const w of String(k.kunde?.[f] ?? '').split(/[\s,]+/)) if (w.length > 2) woerter.push(w)
  }
  for (const f of ['email', 'telefon']) {
    const w = String(k.kunde?.[f] ?? '')
    if (w.length > 3) woerter.push(w)
  }
  for (const o of k.objekte ?? []) if (typeof o.strasse === 'string' && o.strasse.length > 3) woerter.push(o.strasse)
  let t = text
  for (const w of woerter.sort((a, b) => b.length - a.length)) t = t.split(w).join('[…]')
  return t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[E-Mail]').replace(/\+?\d[\d ]{8,}\d/g, '[Telefon]')
}
