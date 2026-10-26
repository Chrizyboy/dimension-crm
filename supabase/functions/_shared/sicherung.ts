// Datensicherung (Phase 16, wie V233 «Backup»): alle Fachtabellen als eine JSON-Datei (gzip) im privaten Speicher
// «sicherungen», Kopie in SharePoint («Direction Interne/CRM Backups», Dateiname wie V233), aufräumen nach 14 bzw.
// 90 Tagen und wiederherstellen. Die Regeln (welche Tabellen, was nie zurückgesetzt wird) stehen in der Datenbank.

import { msEinstellungen } from './abgleich.ts'
import { dienst } from './datenbank.ts'
import { DienstFehler, type Bytes } from './http.ts'
import { hochladen, laufwerkId, sichererName } from './sharepoint.ts'
import { eingerichtet } from './umgebung.ts'

/** Kennung der Datei, damit beim Wiederherstellen nie eine fremde Datei eingespielt wird. */
export const FORMAT = 'dimension-crm-sicherung'

/** Inhalt einer Sicherungsdatei. */
export interface SicherungsInhalt {
  format: typeof FORMAT
  version: 1
  slot: string
  art: string
  erstellt_am: string
  von: string
  tabellen: Record<string, unknown[]>
}

/** Text mit gzip packen (CompressionStream gibt es in Deno und Node). */
export async function packen(text: string): Promise<Bytes> {
  const strom = new Response(text).body!.pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(strom).arrayBuffer())
}

/** gzip wieder auspacken. */
export async function entpacken(bytes: Bytes): Promise<string> {
  const strom = new Response(bytes).body!.pipeThrough(new DecompressionStream('gzip'))
  return new Response(strom).text()
}

/** Termin für manuelle Sicherungen: «manuell-2026-10-26T10-15-03». */
export function zeitSlot(art: string, jetzt = new Date()): string {
  return `${art}-${jetzt.toISOString().slice(0, 19).replace(/:/g, '-')}`
}

/** Dateiname wie in V233 (spFileName): «CRM-Backup_2026-10-26-12.json.gz». */
export function dateiname(slot: string): string {
  return `CRM-Backup_${slot.replace(/[^A-Za-z0-9_-]/g, '-')}.json.gz`
}

/** Zeilen in Stücke teilen, damit keine einzelne Anfrage zu gross wird. */
export function stuecke<T>(zeilen: T[], groesse = 2000): T[][] {
  const teile: T[][] = []
  for (let i = 0; i < zeilen.length; i += groesse) teile.push(zeilen.slice(i, i + groesse))
  return teile.length ? teile : [[]]
}

/** Prüft, ob eine Datei eine Sicherung dieses CRM ist. */
export function istSicherung(x: unknown): x is SicherungsInhalt {
  const s = x as Partial<SicherungsInhalt> | null
  return Boolean(s && s.format === FORMAT && s.version === 1 && s.tabellen && typeof s.tabellen === 'object')
}

interface Einstellung {
  sharepoint_ordner?: string
}

/** Kopie in SharePoint mit der ersten verbundenen Person; Fehler halten die Sicherung nicht auf. */
async function nachSharepoint(id: string, slot: string, bytes: Bytes): Promise<void> {
  if (!eingerichtet().microsoft) return
  try {
    const [p] = await dienst.rpc<{ person_id: string }[]>('ms_verbundene', {})
    if (!p) {
      await dienst.rpc('sicherung_sharepoint', { p_id: id, p_stand: { ok: false, fehler: 'keine_verbindung' } })
      return
    }
    const [e] = await dienst.lies<{ wert: Einstellung }[]>('einstellungen?schluessel=eq.sicherung&select=wert')
    const ordner = (e?.wert.sharepoint_ordner ?? 'Direction Interne/CRM Backups').split('/').map(sichererName).join('/')
    const s = await msEinstellungen()
    const r = await hochladen(p.person_id, await laufwerkId(p.person_id, s), `${ordner}/${dateiname(slot)}`, bytes)
    await dienst.rpc('sicherung_sharepoint', { p_id: id, p_stand: { ok: true, url: r.url } })
  } catch (f) {
    const fehler = f instanceof DienstFehler ? f.code : 'fehler'
    await dienst.rpc('sicherung_sharepoint', { p_id: id, p_stand: { ok: false, fehler } }).catch(() => undefined)
  }
}

/**
 * Sicherung erstellen. Gibt null zurück, wenn derselbe Termin schon läuft (Sperre in der Datenbank).
 * @param slot nur für automatische Sicherungen (aus sicherung_faellig); sonst mit Zeitstempel
 */
export async function sicherungErstellen(
  art: 'automatisch' | 'manuell' | 'vor_wiederherstellung',
  person: { id: string; name: string } | null,
  slot = zeitSlot(art),
): Promise<{ id: string; slot: string; zeilen: number; bytes: number } | null> {
  const id = await dienst.rpc<string | null>('sicherung_beginnen', {
    p_slot: slot,
    p_art: art,
    p_person: person?.id ?? null,
  })
  if (!id) return null
  try {
    const liste = await dienst.rpc<{ tabelle: string }[]>('sicherung_tabellen', {})
    const tabellen: Record<string, unknown[]> = {}
    const anzahl: Record<string, number> = {}
    for (const { tabelle } of liste) {
      tabellen[tabelle] = await dienst.rpc<unknown[]>('sicherung_tabelle', { p_tabelle: tabelle }, 30_000)
      anzahl[tabelle] = tabellen[tabelle].length
    }
    const inhalt: SicherungsInhalt = {
      format: FORMAT,
      version: 1,
      slot,
      art,
      erstellt_am: new Date().toISOString(),
      von: person?.name ?? 'Zeitplan',
      tabellen,
    }
    const bytes = await packen(JSON.stringify(inhalt))
    const pfad = dateiname(slot)
    await dienst.hochladen('sicherungen', pfad, bytes, 'application/gzip', true)
    await dienst.rpc('sicherung_abschliessen', {
      p_id: id,
      p_ok: true,
      p_anzahl: anzahl,
      p_bytes: bytes.length,
      p_pfad: pfad,
    })
    await nachSharepoint(id, slot, bytes)
    return { id, slot, zeilen: Object.values(anzahl).reduce((a, b) => a + b, 0), bytes: bytes.length }
  } catch (f) {
    const fehler = f instanceof DienstFehler ? f.code : f instanceof Error ? f.message.split(':')[0]! : 'fehler'
    await dienst.rpc('sicherung_abschliessen', { p_id: id, p_ok: false, p_fehler: fehler })
    throw f
  }
}

/** Abgelaufene Sicherungen aus dem Speicher nehmen; gibt die Anzahl zurück. */
export async function sicherungenAufraeumen(): Promise<number> {
  const weg = await dienst.rpc<{ id: string; pfad: string | null }[]>('sicherung_aufraeumen', {})
  await dienst.entfernen(
    'sicherungen',
    weg.flatMap((w) => (w.pfad ? [w.pfad] : [])),
  )
  return weg.length
}

/** Ergebnis je Tabelle: zurückgesetzt und in den Papierkorb gelegt. */
export type Wiederherstellung = Record<string, { zurueck: number; papierkorb: number }>

/**
 * Sicherung wiederherstellen (nur Administration, über die Edge Function «sicherung»). Vorher wird der jetzige
 * Stand gesichert (wie V233), dann spielt die Datenbank alles in einer Transaktion ein.
 */
export async function sicherungEinspielen(
  id: string,
  person: { id: string; name: string },
): Promise<Wiederherstellung> {
  const [s] = await dienst.lies<{ status: string; pfad: string | null }[]>(`sicherungen?id=eq.${id}&select=status,pfad`)
  if (!s || s.status !== 'ok' || !s.pfad) throw new DienstFehler('sicherung_fehlt', 404, 'Sicherung')
  const inhalt: unknown = JSON.parse(await entpacken(await dienst.datei('sicherungen', s.pfad)))
  if (!istSicherung(inhalt)) throw new DienstFehler('sicherung_format', 400, 'Sicherung')

  if (!(await sicherungErstellen('vor_wiederherstellung', person))) {
    throw new DienstFehler('sicherung_laeuft', 409, 'Sicherung')
  }
  const lauf = crypto.randomUUID()
  for (const [tabelle, zeilen] of Object.entries(inhalt.tabellen)) {
    let teil = 0
    for (const stueck of stuecke(zeilen)) {
      await dienst.rpc('sicherung_puffern', { p_lauf: lauf, p_tabelle: tabelle, p_teil: teil++, p_zeilen: stueck })
    }
  }
  const ergebnis = await dienst.rpc<Wiederherstellung>('sicherung_einspielen', { p_lauf: lauf }, 120_000)
  await dienst.rpc('sicherung_wiederhergestellt', { p_id: id, p_person: person.id, p_anzahl: ergebnis })
  return ergebnis
}
