import type { Json } from '@/types/datenbank'
import { rufeKi } from '@/services/ki'
import { supabase } from '@/services/supabase'
import type { Angebot, Auswertung, GngVorschlag, Mitbewerber, Nachweis, Referenz } from '../types'

/**
 * Datenzugriff für Submissionen (Entscheid 0041): Go/No-Go-Vorschlag, Eckdaten, Checkliste, Prüfung, Öffnungs-
 * protokoll, Nachweise, Referenzen, Mitbewerber und Auswertung. Abläufe und Regeln liegen in der Datenbank.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Go/No-Go-Vorschlag (0–100) mit Begründung je Teil. */
export async function ladeGng(id: string): Promise<GngVorschlag> {
  const { data, error } = await db().rpc('ausschreibung_gng', { p_id: id })
  if (error) throw error
  return data as unknown as GngVorschlag
}

/** Eckdaten speichern (nur übergebene Felder). */
export async function eckdatenSpeichern(id: string, p: Record<string, unknown>): Promise<void> {
  const { error } = await db().rpc('submission_speichern', { p_id: id, p: p as Json })
  if (error) throw error
}

/** Punkt der Eingabe-Checkliste setzen. */
export async function checklisteSetzen(id: string, schluessel: string, erledigt: boolean): Promise<void> {
  const { error } = await db().rpc('submission_checkliste', {
    p_id: id,
    p_schluessel: schluessel,
    p_erledigt: erledigt,
  })
  if (error) throw error
}

/** Eingabe durch eine zweite Person geprüft. */
export async function pruefen(id: string): Promise<void> {
  const { error } = await db().rpc('submission_pruefen', { p_id: id })
  if (error) throw error
}

/** Öffnungsprotokoll eines Dossiers. */
export async function ladeProtokoll(id: string): Promise<Angebot[]> {
  const { data, error } = await db()
    .from('ausschreibung_angebote')
    .select('id, anbieter, ort, betrag_rappen, rang, wir, bemerkung')
    .eq('ausschreibung_id', id)
    .is('geloescht_am', null)
    .order('rang')
  if (error) throw error
  return data
}

/** Öffnungsprotokoll ersetzen; die Datenbank rechnet den Rang. */
export async function protokollSpeichern(id: string, zeilen: Angebot[]): Promise<void> {
  const { error } = await db().rpc('submission_protokoll', { p_id: id, p_zeilen: zeilen as unknown as Json })
  if (error) throw error
}

/** Alle Nachweise (jüngste zuerst) und die Firmen. */
export async function ladeNachweise(): Promise<{ nachweise: Nachweis[]; firmen: { id: string; name: string }[] }> {
  const [n, f] = await Promise.all([
    db()
      .from('firmen_nachweise')
      .select('id, firma_id, art, ausgestellt_am, gueltig_bis, datei_pfad, notiz')
      .is('geloescht_am', null)
      .order('gueltig_bis', { ascending: false }),
    db().from('firmen').select('id, name').is('geloescht_am', null).order('name'),
  ])
  if (n.error) throw n.error
  if (f.error) throw f.error
  return { nachweise: n.data, firmen: f.data }
}

/** Nachweis ablegen (Datei optional); Gültigkeit rechnet die Datenbank aus der Art. */
export async function nachweisSpeichern(p: {
  firma_id: string
  art: string
  ausgestellt_am: string
  gueltig_bis?: string
  notiz?: string
  datei?: File | null
}): Promise<void> {
  let pfad: string | null = null
  if (p.datei) {
    pfad = `${p.firma_id}/${p.art}-${p.ausgestellt_am}-${p.datei.name.replace(/[^\w.-]+/g, '_')}`
    const up = await db().storage.from('nachweise').upload(pfad, p.datei, { upsert: false })
    if (up.error) throw up.error
  }
  const rest = {
    firma_id: p.firma_id,
    art: p.art,
    ausgestellt_am: p.ausgestellt_am,
    gueltig_bis: p.gueltig_bis,
    notiz: p.notiz,
  }
  const { error } = await db().rpc('firmen_nachweis_speichern', { p: { ...rest, datei_pfad: pfad } as Json })
  if (error) throw error
}

/** Datei eines Nachweises öffnen (Link für 10 Minuten). */
export async function nachweisLink(pfad: string): Promise<string> {
  const { data, error } = await db().storage.from('nachweise').createSignedUrl(pfad, 600)
  if (error) throw error
  return data.signedUrl
}

/** Referenzliste (freigegebene zuerst, neueste zuerst). */
export async function ladeReferenzen(): Promise<Referenz[]> {
  const { data, error } = await db()
    .from('submission_referenzen')
    .select(
      'id, projekt_id, titel, ort, leistung_kwp, jahr, gebaeude, auftraggeber, ansprechperson, telefon, sprache, freigegeben, notiz',
    )
    .is('geloescht_am', null)
    .order('jahr', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data as Referenz[]
}

/** Referenz anlegen oder ändern. */
export async function referenzSpeichern(r: Partial<Referenz> & { titel: string }): Promise<void> {
  const { id, ...felder } = r
  const q = id
    ? db().from('submission_referenzen').update(felder).eq('id', id)
    : db().from('submission_referenzen').insert(felder)
  const { error } = await q
  if (error) throw error
}

/** Referenz in den Papierkorb. */
export async function referenzEntfernen(id: string): Promise<void> {
  const { error } = await db()
    .from('submission_referenzen')
    .update({ geloescht_am: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Projekte mit IBN, die noch keine Referenz sind. */
export async function ladeReferenzVorschlaege() {
  const { data, error } = await db().rpc('referenzen_vorschlaege')
  if (error) throw error
  return data
}

/** Mitbewerber aus allen Öffnungsprotokollen. */
export async function ladeMitbewerber(): Promise<Mitbewerber[]> {
  const { data, error } = await db().rpc('ausschreibung_mitbewerber')
  if (error) throw error
  return data
}

/** Auswertung für einen Zeitraum. */
export async function ladeAuswertung(von: string, bis: string): Promise<Auswertung> {
  const { data, error } = await db().rpc('ausschreibungen_auswertung', { p_von: von, p_bis: bis })
  if (error) throw error
  return data as unknown as Auswertung
}

/** Personen für «verantwortlich». */
export async function ladePersonen(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, name')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Felder, die die KI aus einer eingefügten Publikation liest (Vorschlag; gespeichert wird erst nach Klick). */
export interface Publikation {
  art: 'baugesuch' | 'ausschreibung' | 'zuschlag' | 'planermandat' | 'vorankuendigung' | null
  titel: string | null
  beschreibung: string | null
  gemeinde: string | null
  plz: string | null
  kanton: string | null
  parzelle: string | null
  bauherr: string | null
  bauherr_art: 'privat' | 'firma' | 'gemeinde' | 'landwirtschaft' | null
  vergabestelle: string | null
  frist: string | null
  sprache: 'de' | 'fr' | null
}

/** Eingefügten Text einer Publikation von der KI auslesen lassen. */
export const publikationLesen = (text: string) => rufeKi<Publikation>('publikation', { text })

/** Notiz im Verlauf eines Dossiers (z. B. Frage ans Forum, Anruf, Erkenntnis der Begehung). */
export async function notizSpeichern(dossierId: string, personId: string | null, text: string): Promise<void> {
  const { error } = await db()
    .from('aktivitaeten')
    .insert({ art: 'notiz', text, ausschreibung_id: dossierId, person_id: personId })
  if (error) throw error
}
