import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import type { Eintrag, Fahrzeug, Frist, Geraet, NeuerEintrag, Schaden, SchadenStand, Wahl } from '../types'

/**
 * Datenzugriff für Fahrzeuge und Geräte. Stammdaten schreibt die App direkt (Recht «basis»), Einträge nur über
 * `ressource_eintrag_erfassen` und `ressource_uebergeben`, damit Frist, Kilometer und Zustand stimmen.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Doppeltes Kennzeichen oder Inventar-Nr. als fachlichen Fehler melden statt als technischen. */
function doppelt(error: PostgrestError | null): void {
  if (!error) return
  if (error.code === '23505') throw new Error('ressourcen.doppelt')
  throw error
}

const FAHRZEUG =
  'id, kennzeichen, bezeichnung, marke_modell, jahrgang, standort_id, person_id, km_stand, km_stand_am, naechste_mfk, naechster_service, service_km, leasing_bis, versicherung, ausser_betrieb, notiz, art, treibstoff, erste_inverkehrsetzung, stammnummer, fahrgestell_nr, gesamtgewicht_kg, nutzlast_kg, anhaengelast_kg, ausweis, tankkarte, schluessel, kaufdatum, kaufpreis_rappen, leasinggeber, leasing_vertrag, leasing_beginn, leasing_rate_rappen, leasing_km_jahr, leasing_mehr_km_rappen, versicherung_police, versicherung_deckung, selbstbehalt_rappen, schaden_telefon, praemie_rappen, verkehrssteuer_rappen, reifen, naechster_reifenwechsel, vignette_bis'
const GERAET =
  'id, art, bezeichnung, inventar_nr, serien_nr, hersteller, standort_id, person_id, fahrzeug_id, pruef_monate, naechste_pruefung, zustand, notiz, kaufdatum, kaufpreis_rappen, lieferant, garantie_bis, pruefstelle, uebernommen_am, zurueck_bis, ausgemustert_am, ausgemustert_grund'

/** Alle Fahrzeuge (ohne Papierkorb), nach Bezeichnung. */
export async function ladeFahrzeuge(): Promise<Fahrzeug[]> {
  const { data, error } = await db().from('fahrzeuge').select(FAHRZEUG).is('geloescht_am', null).order('bezeichnung')
  if (error) throw error
  return data as Fahrzeug[]
}

/** Alle Geräte (ohne Papierkorb), nach Art und Bezeichnung. */
export async function ladeGeraete(): Promise<Geraet[]> {
  const { data, error } = await db()
    .from('geraete')
    .select(GERAET)
    .is('geloescht_am', null)
    .order('art')
    .order('bezeichnung')
  if (error) throw error
  return data as Geraet[]
}

const EINTRAG =
  'id, art, datum, km, kosten_rappen, ergebnis, naechste_am, text, erstellt_am, liter, stand, erledigung, erledigt_am, fahrzeug_id, geraet_id, person:personen(name)'

/** Verlauf eines Fahrzeugs oder Geräts, neueste zuerst. */
export async function ladeEintraege(bezug: { fahrzeug?: string; geraet?: string }): Promise<Eintrag[]> {
  let q = db().from('ressourcen_eintraege').select(EINTRAG).is('geloescht_am', null)
  q = bezug.fahrzeug ? q.eq('fahrzeug_id', bezug.fahrzeug) : q.eq('geraet_id', bezug.geraet ?? '')
  const { data, error } = await q.order('datum', { ascending: false }).order('erstellt_am', { ascending: false })
  if (error) throw error
  return data.map(({ person, ...e }) => ({ ...e, person: person?.name ?? null }) as Eintrag)
}

/** Alle offenen Schäden (offen oder in Arbeit) an Fahrzeugen und Geräten, älteste zuerst. */
export async function ladeOffeneSchaeden(): Promise<Schaden[]> {
  const { data, error } = await db()
    .from('ressourcen_eintraege')
    .select(EINTRAG)
    .eq('art', 'schaden')
    .in('stand', ['offen', 'in_arbeit'])
    .is('geloescht_am', null)
    .order('datum')
  if (error) throw error
  return data.map(({ person, ...e }) => ({ ...e, person: person?.name ?? null }) as Schaden)
}

/** Stand eines Schadens setzen, mit Text (Garage, Versicherungsfall) und Kosten. */
export async function schadenSetzen(
  id: string,
  stand: SchadenStand,
  erledigung: string | null,
  kostenRappen: number | null,
): Promise<void> {
  const { error } = await db().rpc('ressource_schaden_setzen', {
    p_eintrag: id,
    p_stand: stand,
    ...(erledigung ? { p_erledigung: erledigung } : {}),
    ...(kostenRappen !== null ? { p_kosten_rappen: kostenRappen } : {}),
  })
  if (error) throw error
}

/** Alle Fristen (MFK, Service, Prüfung, Ausweis) aus der Sicht `fristen`. */
export async function ladeFristen(): Promise<Frist[]> {
  const { data, error } = await db().from('fristen').select('*').order('faellig_am')
  if (error) throw error
  return data as Frist[]
}

/** Aktive Personen und Standorte für die Auswahlfelder. */
export async function ladeWahl(): Promise<{ personen: Wahl[]; standorte: Wahl[] }> {
  const [p, s] = await Promise.all([
    db().from('personen').select('id, name').eq('aktiv', true).is('geloescht_am', null).order('name'),
    db().from('standorte').select('id, name').is('geloescht_am', null).order('name'),
  ])
  if (p.error) throw p.error
  if (s.error) throw s.error
  return { personen: p.data, standorte: s.data }
}

/** Fahrzeug anlegen (ohne id) oder ändern; gibt die id zurück. */
export async function fahrzeugSpeichern(werte: Omit<Partial<Fahrzeug>, 'id'>, id?: string): Promise<string> {
  if (id) {
    doppelt((await db().from('fahrzeuge').update(werte).eq('id', id)).error)
    return id
  }
  const { data, error } = await db()
    .from('fahrzeuge')
    .insert({ kennzeichen: '', bezeichnung: '', ...werte })
    .select('id')
    .single()
  doppelt(error)
  return data?.id ?? ''
}

/** Gerät anlegen (ohne id) oder ändern; gibt die id zurück. */
export async function geraetSpeichern(werte: Omit<Partial<Geraet>, 'id'>, id?: string): Promise<string> {
  if (id) {
    doppelt((await db().from('geraete').update(werte).eq('id', id)).error)
    return id
  }
  const { data, error } = await db()
    .from('geraete')
    .insert({ art: '', bezeichnung: '', ...werte })
    .select('id')
    .single()
  doppelt(error)
  return data?.id ?? ''
}

/** Fahrzeug oder Gerät in den Papierkorb (nie hart löschen). */
export async function entfernen(tabelle: 'fahrzeuge' | 'geraete', id: string): Promise<void> {
  const { error } = await db().from(tabelle).update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Eintrag erfassen; die id kommt aus der App, damit ein zweiter Klick nichts doppelt anlegt. */
export async function eintragErfassen(e: NeuerEintrag, id: string = crypto.randomUUID()): Promise<string> {
  const { data, error } = await db().rpc('ressource_eintrag_erfassen', {
    p_id: id,
    p_fahrzeug: e.fahrzeug_id as string,
    p_geraet: e.geraet_id as string,
    p_art: e.art,
    p_datum: e.datum,
    ...(e.km !== null ? { p_km: e.km } : {}),
    ...(e.kosten_rappen !== null ? { p_kosten_rappen: e.kosten_rappen } : {}),
    ...(e.ergebnis ? { p_ergebnis: e.ergebnis } : {}),
    ...(e.naechste ? { p_naechste: e.naechste } : {}),
    ...(e.text ? { p_text: e.text } : {}),
    ...(e.liter ? { p_liter: e.liter } : {}),
  })
  if (error) throw error
  return data
}

/** Weitergeben an eine Person, in ein Fahrzeug (nur Geräte) oder zurück ins Lager (beides null). */
export async function uebergeben(
  bezug: { fahrzeug?: string; geraet?: string },
  person: string | null,
  inFahrzeug: string | null,
  text: string,
  zurueckBis: string | null = null,
): Promise<void> {
  const { error } = await db().rpc('ressource_uebergeben', {
    p_fahrzeug: (bezug.fahrzeug ?? null) as string,
    p_geraet: (bezug.geraet ?? null) as string,
    p_person: person as string,
    ...(inFahrzeug ? { p_in_fahrzeug: inFahrzeug } : {}),
    ...(text.trim() ? { p_text: text.trim() } : {}),
    ...(zurueckBis ? { p_zurueck_bis: zurueckBis } : {}),
  })
  if (error) throw error
}
