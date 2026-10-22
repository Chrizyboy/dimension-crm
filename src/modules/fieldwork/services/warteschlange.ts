import { create } from 'zustand'
import { fachFehlerSchluessel } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { supabase } from '@/services/supabase'
import { istNetzFehler, istSchonDa } from '../lib/netz'
import {
  ablageLesen,
  ablageSchreiben,
  auftraegeLesen,
  auftragAnhaengen,
  auftragEntfernen,
  auftragErsetzen,
} from './speicher'

/**
 * Warteschlange am Handy: Jede Änderung des Monteurs (Rapport, Zeit, Foto, Unterschrift) wird zuerst am Gerät
 * gespeichert und dann der Reihe nach gesendet. Ohne Netz bleibt sie liegen und geht beim nächsten Netz raus.
 * Die Datenbank-Funktionen sind wiederholbar (eigene IDs vom Handy), doppeltes Senden schadet also nicht.
 */

export type RpcName =
  | 'rapport_speichern'
  | 'rapport_abschliessen'
  | 'zeit_starten'
  | 'zeit_stoppen'
  | 'zeit_speichern'
  | 'nachtrag_speichern'

interface Basis {
  nr?: number
  /** Rapport, zu dem der Auftrag gehört (für Fotos, die noch nicht oben sind). */
  bezug?: string
  erstellt: string
  /** Übersetzungs-Schlüssel oder Text, wenn der Server den Auftrag abgelehnt hat. */
  fehler?: string
}
export type Auftrag =
  | (Basis & { art: 'rpc'; name: RpcName; args: Record<string, unknown> })
  | (Basis & {
      art: 'datei'
      blob: Blob
      pfad: string
      dokument: { id: string; name: string; mime_typ: string; ordner: string; bezug_tabelle: string; bezug_id: string }
    })

interface Stand {
  /** Aufträge, die noch nicht gesendet sind. */
  offen: number
  /** Vom Server abgelehnte Aufträge (bleiben sichtbar, bis jemand sie verwirft). */
  abgelehnt: Auftrag[]
  /** Zählt erfolgreich gesendete Aufträge; Ansichten laden danach neu. */
  version: number
  laeuft: boolean
}

/** Stand der Warteschlange für die Oberfläche. */
export const useWarteschlange = create<Stand>()(() => ({ offen: 0, abgelehnt: [], version: 0, laeuft: false }))

async function standAktualisieren(): Promise<void> {
  const alle = await auftraegeLesen<Auftrag>()
  useWarteschlange.setState({ offen: alle.filter((a) => !a.fehler).length, abgelehnt: alle.filter((a) => a.fehler) })
}

async function ausfuehren(a: Auftrag): Promise<void> {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  if (a.art === 'rpc') {
    const { error } = await supabase.rpc(a.name as never, a.args as never)
    if (error) throw error
    return
  }
  const hoch = await supabase.storage.from('dokumente').upload(a.pfad, a.blob, { contentType: a.dokument.mime_typ })
  if (hoch.error && !istSchonDa(hoch.error)) throw hoch.error
  const { error } = await supabase
    .from('dokumente')
    .insert({ ...a.dokument, bytes: a.blob.size, speicher: 'intern', speicher_pfad: a.pfad })
  if (error && !istSchonDa(error)) throw error
}

let lauf: Promise<void> | null = null

/** Alles Offene senden, der Reihe nach. Bei Funkloch Abbruch, beim nächsten Versuch geht es weiter. */
export function abarbeiten(): Promise<void> {
  if (!navigator.onLine) return standAktualisieren()
  lauf ??= (async () => {
    useWarteschlange.setState({ laeuft: true })
    try {
      for (const a of await auftraegeLesen<Auftrag>()) {
        if (a.fehler || a.nr === undefined) continue
        try {
          await ausfuehren(a)
          await auftragEntfernen(a.nr)
          useWarteschlange.setState((s) => ({ version: s.version + 1 }))
        } catch (e) {
          if (istNetzFehler(e)) break
          const schluessel = fachFehlerSchluessel(e)
          if (!schluessel) meldeFehler(e, 'baustelle')
          await auftragErsetzen({ ...a, fehler: schluessel ?? String((e as { message?: unknown }).message ?? e) })
        }
      }
    } finally {
      await standAktualisieren()
      useWarteschlange.setState({ laeuft: false })
    }
  })().finally(() => {
    lauf = null
  })
  return lauf
}

/** Auftrag am Gerät speichern und gleich zu senden versuchen. */
export async function einreihen(a: Auftrag): Promise<void> {
  await auftragAnhaengen(a)
  await standAktualisieren()
  void abarbeiten()
}

/** Abgelehnten Auftrag verwerfen (nach Rückfrage in der Oberfläche). */
export async function verwerfen(nr: number): Promise<void> {
  await auftragEntfernen(nr)
  await standAktualisieren()
}

/** Noch nicht gesendete Dateien eines Rapports (für die Vorschau der Fotos). */
export async function offeneDateien(bezug: string): Promise<Extract<Auftrag, { art: 'datei' }>[]> {
  const alle = await auftraegeLesen<Auftrag>()
  return alle.filter((a): a is Extract<Auftrag, { art: 'datei' }> => a.art === 'datei' && a.bezug === bezug)
}

/**
 * Daten laden mit Ablage am Gerät: Solange Änderungen warten, gilt die Ablage (sie enthält sie schon);
 * sonst der Server, und ohne Netz wieder die Ablage.
 */
export async function mitAblage<T>(schluessel: string, laden: () => Promise<T>): Promise<T> {
  const alt = await ablageLesen<T>(schluessel).catch(() => undefined)
  // Ohne Netz gar nicht erst fragen: die Anmeldung von Supabase würde sonst lange auf Antwort warten.
  if (alt !== undefined && (!navigator.onLine || useWarteschlange.getState().offen > 0)) return alt
  try {
    const neu = await laden()
    await ablageSchreiben(schluessel, neu).catch(() => undefined)
    return neu
  } catch (e) {
    if (alt !== undefined && istNetzFehler(e)) return alt
    throw e
  }
}

/** Abgelegten Wert ändern (nach einer Änderung am Handy, bevor der Server sie kennt). */
export async function ablageAendern<T>(schluessel: string, f: (alt: T | undefined) => T | undefined): Promise<void> {
  const neu = f(await ablageLesen<T>(schluessel))
  if (neu !== undefined) await ablageSchreiben(schluessel, neu)
}

let gestartet = false

/** Beim Start: Stand lesen, bei Netz und alle 30 Sekunden senden. Einmal pro App. */
export function warteschlangeStarten(): void {
  if (gestartet || typeof window === 'undefined' || !('indexedDB' in window)) return
  gestartet = true
  void standAktualisieren().then(abarbeiten)
  window.addEventListener('online', () => void abarbeiten())
  window.setInterval(() => {
    if (useWarteschlange.getState().offen > 0) void abarbeiten()
  }, 30_000)
}
