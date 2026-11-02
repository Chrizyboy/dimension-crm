import { verkleinern } from '@/lib/bild'
import { dokumentAdresse } from '@/services/dokumente'
import { meldeFehler } from '@/services/fehler'
import { supabase } from '@/services/supabase'
import type { Auszahlung, NeueSpese, Spese, SpesenProjekt } from '../types'

/**
 * Datenzugriff für Spesen. Wer was sehen und ändern darf, prüft die Datenbank: eigene Spesen jede Person,
 * alle nur mit Recht «finanzen»; prüfen, Rückfrage, ablehnen und auszahlen nur die Buchhaltung. Ausbezahlte,
 * abgelehnte und stornierte bleiben fest (Storno statt Löschen).
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Spesen der Person oder (personId null) alle, die die Datenbank zeigt; neueste zuerst. */
export async function ladeSpesen(personId: string | null): Promise<Spese[]> {
  let q = db().from('spesen_liste').select('*')
  if (personId) q = q.eq('person_id', personId)
  const { data, error } = await q
    .order('datum', { ascending: false })
    .order('erstellt_am', { ascending: false })
    .limit(5000)
  if (error) throw error
  type Roh = Omit<Spese, 'hinweise' | 'verlauf'> & Partial<Pick<Spese, 'hinweise' | 'verlauf'>>
  return (data as unknown as Roh[]).map((s) => ({ ...s, hinweise: s.hinweise ?? [], verlauf: s.verlauf ?? [] }))
}

/** Felder der Tabelle aus dem Formular (ohne Beleg). Kilometer-Betrag rechnet die Datenbank. */
function felder(n: NeueSpese) {
  return {
    art: n.art,
    datum: n.datum,
    betrag_rappen: n.art === 'kilometer' ? 1 : n.betrag_rappen,
    kategorie: n.kategorie,
    zweck: n.zweck.trim(),
    notiz: n.notiz,
    projekt_id: n.projekt_id,
    bezahlt_mit: n.art === 'kilometer' ? ('eigen' as const) : n.bezahlt_mit,
    mwst_satz: n.art === 'kilometer' ? null : n.mwst_satz,
    mwst_rappen: n.art === 'kilometer' ? null : n.mwst_rappen,
    personen: n.personen,
    km: n.art === 'kilometer' ? n.km : null,
    strecke: n.art === 'kilometer' ? n.strecke : null,
  }
}

/**
 * Spese erfassen, mit Beleg: zuerst die Spese, dann der Beleg (Fotos verkleinert) in den Ablage-Ordner
 * «spesen» und an die Spese gehängt. Scheitert der Beleg, bleibt die Spese ohne Beleg und der Fehler kommt zurück.
 */
export async function speseErfassen(personId: string, n: NeueSpese): Promise<string> {
  const { data, error } = await db()
    .from('spesen')
    .insert({ person_id: personId, ...felder(n) })
    .select('id')
    .single()
  if (error) throw error
  if (n.beleg) await belegAnhaengen(data.id, n.beleg)
  return data.id
}

/**
 * Spese ändern (die Person vor der Prüfung oder bei einer Rückfrage, die Buchhaltung bis zur Auszahlung).
 * Eine Änderung bei offener Rückfrage gilt als Antwort: die Spese geht zurück an die Buchhaltung.
 */
export async function speseAendern(id: string, n: NeueSpese): Promise<void> {
  const { error } = await db().from('spesen').update(felder(n)).eq('id', id)
  if (error) throw error
  if (n.beleg) await belegAnhaengen(id, n.beleg)
}

/** Beleg hochladen und an die Spese hängen. */
export async function belegAnhaengen(speseId: string, datei: File): Promise<void> {
  const bild = datei.type.startsWith('image/')
  const blob = bild ? await verkleinern(datei) : datei
  const typ = bild ? blob.type || 'image/jpeg' : datei.type || 'application/octet-stream'
  const name = bild ? datei.name.replace(/\.[^.]+$/, '') + '.jpg' : datei.name
  const pfad = `spesen/${speseId}/${String(Date.now())}-${name.replace(/[^\w.-]+/g, '_')}`
  const hoch = await db().storage.from('dokumente').upload(pfad, blob, { contentType: typ })
  if (hoch.error) throw hoch.error
  const d = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: typ,
      bytes: blob.size,
      ordner: 'spesen',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'spesen',
      bezug_id: speseId,
    })
    .select('id')
    .single()
  if (d.error) throw d.error
  const { error } = await db().from('spesen').update({ beleg_id: d.data.id }).eq('id', speseId)
  if (error) throw error
}

/** Adresse zum Ansehen des Belegs (kurz gültig). */
export async function belegAdresse(belegId: string): Promise<string | null> {
  const { data, error } = await db()
    .from('dokumente')
    .select('sharepoint_url, speicher_pfad')
    .eq('id', belegId)
    .single()
  if (error) throw error
  return dokumentAdresse(data)
}

/** Beleg in einem neuen Fenster öffnen (kurz gültige Adresse). */
export async function belegZeigen(id: string) {
  // Fenster sofort öffnen (sonst blockiert der Browser es), dann die kurz gültige Adresse setzen.
  const fenster = window.open('', '_blank')
  try {
    const adresse = await belegAdresse(id)
    if (adresse && fenster) fenster.location.href = adresse
    else fenster?.close()
  } catch (f) {
    fenster?.close()
    meldeFehler(f, 'spesen')
  }
}

/** Stornieren (zurückziehen) mit Grund; bleibt sichtbar (V233 «Storno statt Löschen»). */
export async function speseStornieren(id: string, grund: string): Promise<void> {
  const { error } = await db().rpc('spesen_stornieren', { p_id: id, p_grund: grund })
  if (error) throw error
}

/** Geprüft (nur Buchhaltung); gibt die Anzahl zurück. */
export async function spesenGeprueft(ids: string[]): Promise<number> {
  const { data, error } = await db().rpc('spesen_geprueft', { p_ids: ids })
  if (error) throw error
  return data
}

/** Rückfrage an die Person (nur Buchhaltung); sie bekommt eine Glocke. */
export async function speseRueckfrage(id: string, text: string): Promise<void> {
  const { error } = await db().rpc('spesen_rueckfrage', { p_id: id, p_text: text })
  if (error) throw error
}

/** Ablehnen mit Grund (nur Buchhaltung); die Person bekommt eine Glocke. */
export async function speseAblehnen(id: string, grund: string): Promise<void> {
  const { error } = await db().rpc('spesen_ablehnen', { p_id: id, p_grund: grund })
  if (error) throw error
}

/** Auszahlungslauf (nur Buchhaltung): mit dem Lohn oder per Überweisung; gibt die ID des Laufs zurück. */
export async function auszahlungErstellen(
  ids: string[],
  datum: string,
  art: 'lohn' | 'ueberweisung',
  titel: string | null,
): Promise<string | null> {
  const { data, error } = await db().rpc('spesen_auszahlung', {
    p_ids: ids,
    p_datum: datum,
    p_art: art,
    ...(titel ? { p_titel: titel } : {}),
  })
  if (error) throw error
  return data
}

/** Bisherige Auszahlungsläufe, neueste zuerst. */
export async function ladeAuszahlungen(): Promise<Auszahlung[]> {
  const { data, error } = await db()
    .from('spesen_auszahlungen_liste')
    .select('*')
    .order('datum', { ascending: false })
    .limit(60)
  if (error) throw error
  return data as unknown as Auszahlung[]
}

/** Projekte zur Auswahl beim Erfassen (laufende und kürzlich abgeschlossene). */
export async function ladeProjekte(): Promise<SpesenProjekt[]> {
  const { data, error } = await db().rpc('spesen_projekte')
  if (error) throw error
  return data
}

/** Vermerken, dass die Spesen per Mail an die Buchhaltung gingen (Datum). */
export async function mailVermerken(ids: string[]): Promise<void> {
  const { error } = await db()
    .from('spesen')
    .update({ mail: { am: new Date().toISOString() } })
    .in('id', ids)
  if (error) throw error
}
