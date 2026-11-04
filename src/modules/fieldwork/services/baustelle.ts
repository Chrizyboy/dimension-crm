import { supabase } from '@/services/supabase'
import type {
  Abwesenheit,
  InternerPosten,
  MeinTag,
  Nachtrag,
  NachtragFilter,
  ProjektTreffer,
  Pflichtfoto,
  Pruefpunkt,
  Rapport,
  RapportArt,
  RapportBild,
  RapportFilter,
  Vorjahr,
  WartungPruefung,
  Zeit,
  ZeitArt,
} from '../types'
import { pruefpunkteFuer, type PaketEinstellung } from '../lib/inspektion'
import type { Wochenplan } from '../lib/wochenplan'

/**
 * Datenzugriff für Baustelle & Rapporte. Die Regeln (wer darf was, was folgt aus dem Abschluss) liegen in
 * den Datenbank-Funktionen `rapport_*`, `zeit_*`, `nachtrag_*` und `zeiten_*`.
 */
export function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Einsätze und Service-Termine einer Person (ohne Angabe: die angemeldete) mit laufender Zeit. */
export async function ladeTag(von: string, bis: string, person?: string | null): Promise<MeinTag> {
  const { data, error } = await db().rpc('mein_tag', {
    p_von: von,
    p_bis: bis,
    ...(person ? { p_person: person } : {}),
  })
  if (error) throw error
  return data as unknown as MeinTag
}

/** Eigene Abwesenheiten (Ferien, Krank, Kurs …, auch «Abwesend» aus Outlook) im Zeitraum, für «Mein Plan». */
export async function ladeAbwesenheiten(von: string, bis: string, person: string): Promise<Abwesenheit[]> {
  const { data, error } = await db()
    .from('abwesenheiten_alle')
    .select('id, art, von, bis, halbtag')
    .eq('person_id', person)
    .lte('von', bis)
    .gte('bis', von)
    .order('von')
  if (error) throw error
  return data as Abwesenheit[]
}

/** Ein Rapport (null, wenn er erst am Handy existiert). */
export async function ladeRapport(id: string): Promise<Rapport | null> {
  const { data, error } = await db().from('rapporte_liste').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as Rapport | null
}

/** Rapporte nach Filter, neueste zuerst. */
export async function ladeRapporte(filter: RapportFilter): Promise<Rapport[]> {
  let q = db().from('rapporte_liste').select('*')
  if (filter === 'offen') q = q.is('abgeschlossen_am', null)
  if (filter === 'abgeschlossen') q = q.not('abgeschlossen_am', 'is', null)
  const { data, error } = await q.order('datum', { ascending: false }).order('nummer', { ascending: false }).limit(500)
  if (error) throw error
  return data as unknown as Rapport[]
}

/** Fotos und Unterschrift eines Rapports. */
export async function ladeBilder(rapportId: string): Promise<RapportBild[]> {
  const { data, error } = await db()
    .from('dokumente')
    .select('id, name, ordner, speicher_pfad, kategorie')
    .eq('bezug_tabelle', 'rapporte')
    .eq('bezug_id', rapportId)
    .is('geloescht_am', null)
    .order('erstellt_am')
  if (error) throw error
  return data.map((d) => ({ ...d, ordner: d.ordner ?? 'fotos', lokal: false }))
}

/** Kurz gültige Links für Vorschaubilder (der Speicher bleibt privat). */
export async function bildAdressen(pfade: string[]): Promise<Map<string, string>> {
  if (pfade.length === 0) return new Map()
  const { data, error } = await db().storage.from('dokumente').createSignedUrls(pfade, 600)
  if (error) throw error
  return new Map(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])))
}

/** Nachträge, auf Wunsch nur die eines Rapports. */
export async function ladeNachtraege(filter: NachtragFilter, rapportId?: string): Promise<Nachtrag[]> {
  let q = db().from('nachtraege_liste').select('*').is('geloescht_am', null)
  if (rapportId) q = q.eq('rapport_id', rapportId)
  if (filter !== 'alle') q = q.eq('status', filter)
  const { data, error } = await q.order('erstellt_am', { ascending: false }).limit(500)
  if (error) throw error
  return data as unknown as Nachtrag[]
}

/** Zeiten zwischen zwei Tagen (Schweizer Datum), auf Wunsch einer Person. Fremde sieht nur, wer prüfen darf. */
export async function ladeZeiten(von: string, bis: string, person?: string | null): Promise<Zeit[]> {
  let q = db().from('zeiten_liste').select('*').is('geloescht_am', null).gte('tag', von).lte('tag', bis)
  if (person) q = q.eq('person_id', person)
  const { data, error } = await q.order('start')
  if (error) throw error
  return data as unknown as Zeit[]
}

/** Pflichtfotos je Rapport-Art (Einstellungen › Baustelle). */
export async function ladePflichtfotos(): Promise<Partial<Record<RapportArt, Pflichtfoto[]>>> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'baustelle').maybeSingle()
  if (error) throw error
  return (data?.wert as { pflichtfotos?: unknown } | null)?.pflichtfotos ?? {}
}

/** Interne Posten für Zeit ohne Kunde (Einstellungen › Baustelle). */
export async function ladeInternePosten(): Promise<InternerPosten[]> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'baustelle').maybeSingle()
  if (error) throw error
  return (data?.wert as { interne_posten?: InternerPosten[] } | null)?.interne_posten ?? []
}

/** Prüfpunkte des IBN-Protokolls (Einstellungen). */
export async function ladePruefpunkte(): Promise<Pruefpunkt[]> {
  const { data, error } = await db()
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'ibn_pruefpunkte')
    .maybeSingle()
  if (error) throw error
  return (data?.wert ?? []) as unknown as Pruefpunkt[]
}

/**
 * Inspektion eines Wartungsvertrags: Prüfpunkte nach Paket (`wartung_pakete`), Werte der letzten Inspektion oder
 * der IBN (`wartung_vorjahr`) und die Schwelle für Abweichungen.
 */
export async function ladeWartungPruefung(vertragId: string): Promise<WartungPruefung> {
  const [einst, vertrag, vorjahr] = await Promise.all([
    db().from('einstellungen').select('wert').eq('schluessel', 'wartung_pakete').maybeSingle(),
    db().from('wartungsvertraege').select('paket').eq('id', vertragId).maybeSingle(),
    db().rpc('wartung_vorjahr', { p_vertrag: vertragId }),
  ])
  if (einst.error) throw einst.error
  if (vertrag.error) throw vertrag.error
  if (vorjahr.error) throw vorjahr.error
  const e = (einst.data?.wert ?? {}) as unknown as PaketEinstellung
  return {
    punkte: pruefpunkteFuer(e, vertrag.data?.paket ?? null),
    vorjahr: (vorjahr.data ?? null) as unknown as Vorjahr | null,
    abweichung_prozent: e.abweichung_prozent ?? 10,
  }
}

/** Aktive Personen (für Filter und «Tag von …»). */
export async function ladePersonen(): Promise<{ id: string; name: string; kuerzel: string | null }[]> {
  const { data, error } = await db().from('personen').select('id, name, kuerzel').eq('aktiv', true).order('name')
  if (error) throw error
  return data
}

/** IDs der Mitarbeitenden, deren direkte Vorgesetzte die angemeldete Person ist: deren Zeiten darf sie sehen. */
export async function ladeMeineMitarbeitenden(): Promise<string[]> {
  const { data, error } = await db().rpc('meine_mitarbeitenden')
  if (error) throw error
  return data
}

/** Projekte für «Neuer Rapport», gesucht nach Projektnummer oder Name des Kunden. */
export async function sucheProjekte(text: string): Promise<ProjektTreffer[]> {
  const s = text
    .trim()
    .replace(/[%,()*]/g, ' ')
    .trim()
  const felder = 'id, nummer, titel, kontakt:kontakte!inner(vorname, nachname, firma)'
  const basis = () => db().from('projekte').select(felder).is('geloescht_am', null)
  const [nachNummer, nachKunde] = await Promise.all([
    s ? basis().ilike('nummer', `%${s}%`).limit(10) : basis().order('erstellt_am', { ascending: false }).limit(10),
    s
      ? basis()
          .or(`nachname.ilike.%${s}%,vorname.ilike.%${s}%,firma.ilike.%${s}%`, { referencedTable: 'kontakte' })
          .limit(10)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (nachNummer.error) throw nachNummer.error
  if (nachKunde.error) throw nachKunde.error
  const gesehen = new Set<string>()
  return [...nachNummer.data, ...nachKunde.data].flatMap((p) => {
    if (gesehen.has(p.id)) return []
    gesehen.add(p.id)
    const k = p.kontakt as { vorname: string | null; nachname: string | null; firma: string | null } | null
    const kunde = [k?.vorname, k?.nachname].filter(Boolean).join(' ') || k?.firma || null
    return [{ id: p.id, nummer: p.nummer, titel: p.titel, kunde }]
  })
}

/** Aktiver Wartungsvertrag eines Projekts (für den Wartungs-Rapport). */
export async function wartungsvertragZumProjekt(projektId: string): Promise<string | null> {
  const { data, error } = await db()
    .from('wartungsvertraege')
    .select('id')
    .eq('projekt_id', projektId)
    .eq('status', 'aktiv')
    .is('geloescht_am', null)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

/** Abgeschlossenen Rapport wieder öffnen (Recht «Preise»). */
export async function rapportOeffnen(id: string): Promise<void> {
  const { error } = await db().rpc('rapport_oeffnen', { p_id: id })
  if (error) throw error
}

/** Betrag eines Nachtrags setzen, auch nach der Bestätigung bis zur Verrechnung (Trigger prüft Recht «Preise»). */
export async function nachtragBetrag(n: Nachtrag, rappen: number | null): Promise<void> {
  const { error } = await db().from('nachtraege').update({ betrag_rappen: rappen }).eq('id', n.id)
  if (error) throw error
}

/** Stand eines Nachtrags im Büro setzen (bestätigt per Mail, abgelehnt mit Grund, wieder offen). */
export async function nachtragStatus(id: string, status: string, grund?: string): Promise<void> {
  const { error } = await db().rpc('nachtrag_status', {
    p_id: id,
    p_status: status,
    ...(grund ? { p_grund: grund } : {}),
  })
  if (error) throw error
}

/** Zeiten als geprüft markieren; gibt die Anzahl zurück. */
export async function zeitenPruefen(ids: string[]): Promise<number> {
  const { data, error } = await db().rpc('zeiten_pruefen', { p_ids: ids })
  if (error) throw error
  return data
}

/** Geprüfte Zeiten als exportiert markieren (Recht «Finanzen»). */
export async function zeitenExportieren(ids: string[]): Promise<void> {
  const { error } = await db().rpc('zeiten_exportieren', { p_ids: ids })
  if (error) throw error
}

/** Zeit von Hand erfassen oder korrigieren (z. B. Start vergessen, Pause nachtragen). */
export async function zeitSpeichern(p: {
  id?: string
  person_id?: string
  start: string
  stopp: string
  pause_min: number
  art: ZeitArt
  projekt_id?: string | null
  service_fall_id?: string | null
  intern?: string | null
  rapport_id?: string | null
  notiz?: string | null
}): Promise<void> {
  const { error } = await db().rpc('zeit_speichern', { p })
  if (error) throw error
}

/** Wochenplan je Person im Zeitraum (Einsätze, Service, Abwesenheiten, abgelaufene Kurse). */
export async function ladeWochenplan(von: string, bis: string): Promise<Wochenplan> {
  const { data, error } = await db().rpc('wochenplan', { p_von: von, p_bis: bis })
  if (error) throw error
  return data as unknown as Wochenplan
}

/** Einsatz im Wochenplan um Tage verschieben und auf Wunsch eine Person durch eine andere ersetzen. */
export async function einsatzVerschieben(id: string, tage: number, vonPerson: string | null, zuPerson: string | null) {
  const { error } = await db().rpc('einsatz_verschieben', {
    p_id: id,
    p_tage: tage,
    ...(vonPerson ? { p_von_person: vonPerson } : {}),
    ...(zuPerson ? { p_zu_person: zuPerson } : {}),
  })
  if (error) throw error
}

/** Service-Termin auf einen anderen Tag (gleiche Uhrzeit) und auf Wunsch zu einer anderen Person legen. */
export async function serviceTerminVerschieben(id: string, datum: string, person: string | null) {
  const { error } = await db().rpc('service_termin_verschieben', {
    p_id: id,
    p_datum: datum,
    ...(person ? { p_person: person } : {}),
  })
  if (error) throw error
}
