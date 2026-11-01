// Namen und Pfade der automatischen Dateiablage (Entscheid 0031). Reine Funktionen ohne Microsoft,
// damit sie sich ohne Netz prüfen lassen; die Arbeit mit SharePoint macht ablage.ts.

import { sichererName } from './sharepoint.ts'

/** Einstellung «ablage» (Administration, Einstellungen › Verbindungen). */
export interface AblageEinstellung {
  aktiv: boolean
  aktiv_seit: string | null
  bibliothek?: string
  /** Kürzel der Person, deren Microsoft-Verbindung die Ablage nutzt (braucht Zugriff auf die Bibliothek). */
  person?: string
  name?: string
  standorte: Record<string, { offerten: string; auftraege: string; verloren: string }>
  unterordner: Record<string, string>
  zuordnung: Record<string, string>
}

/** Ein Ordner, wie ihn ablage_offen liefert. */
export interface OffenerOrdner {
  id: string
  soll: 'offerte' | 'auftrag' | 'verloren'
  stand: 'offerte' | 'auftrag' | 'verloren' | null
  item_id: string | null
  pfad: string | null
  url: string | null
  nummer: string
  kunde: string
  ort: string | null
  titel: string | null
  standort: string
  jahr_offerte: number | null
  jahr_auftrag: number | null
}

/** Platzhalter «{name}» ersetzen; fehlende Werte fallen weg samt doppelten Trennern. */
export function ersetze(vorlage: string, werte: Record<string, string | number | null | undefined>): string {
  return vorlage
    .replace(/\{(\w+)\}/g, (_, k: string) => String(werte[k] ?? '').trim())
    .replace(/(\s-\s)+(?=\s*-\s|$)/g, '')
    .replace(/^\s*-\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Ordnername «101687 - Anna Muster - Bulle». */
export function ordnerName(e: AblageEinstellung, o: OffenerOrdner): string {
  const name = ersetze(e.name ?? '{nummer} - {kunde} - {ort}', {
    nummer: o.nummer,
    kunde: o.kunde === '–' ? '' : o.kunde,
    ort: o.ort,
    titel: o.titel,
  })
  return sichererName(name) || sichererName(o.nummer)
}

/** Übergeordneter Ordner je nach Stand: Offerten «D 2026», Aufträge «A 2026» oder Archiv. */
export function elternPfad(e: AblageEinstellung, o: OffenerOrdner): string {
  const s = e.standorte[o.standort] ?? Object.values(e.standorte)[0]
  if (!s) throw new Error('ablage_standort_fehlt')
  const vorlage = o.soll === 'auftrag' ? s.auftraege : o.soll === 'verloren' ? s.verloren : s.offerten
  const jahr = (o.soll === 'auftrag' ? o.jahr_auftrag : o.jahr_offerte) ?? new Date().getFullYear()
  return vorlage
    .replace(/\{jahr\}/g, String(jahr))
    .split('/')
    .map((t) => sichererName(t))
    .filter(Boolean)
    .join('/')
}

/** Unterordner für ein Dokument aus dem CRM (z. B. «offerte» → «Devis - …»); null = direkt in den Ordner. */
export function unterordnerFuer(e: AblageEinstellung, dokumentOrdner: string | null): string | null {
  const schluessel = e.zuordnung[dokumentOrdner ?? ''] ?? ''
  return e.unterordner[schluessel] ?? null
}
