import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { Baustein, BausteinZeile, Leistung, PreisRegeln, PreisVerlaufEintrag } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Preis-Regeln; ohne Recht «preise» nur Förderung und Rundung. */
export async function ladeRegeln(): Promise<PreisRegeln> {
  const { data, error } = await db().rpc('preise_regeln')
  if (error) throw error
  return (data ?? {}) as PreisRegeln
}

/** Regeln ändern (nur Geschäftsleitung); nur die genannten Schlüssel. */
export async function setzeRegeln(p: Partial<PreisRegeln>) {
  const { error } = await db().rpc('preise_regeln_setzen', { p: p as Json })
  if (error) throw error
}

/** Leistungen & Pauschalen, nach Reihenfolge. Kosten nur mit Recht «preise» (sonst null). */
export async function ladeLeistungen(): Promise<Leistung[]> {
  const { data, error } = await db().from('leistungen_liste').select('*').order('reihenfolge')
  if (error) throw error
  return data.map((l) => ({
    id: l.id ?? '',
    schluessel: l.schluessel ?? '',
    nameDe: l.name_de ?? '',
    nameFr: l.name_fr ?? '',
    einheit: l.einheit ?? '',
    kostenRappen: l.kosten_rappen,
    verkaufRappen: l.verkauf_rappen ?? 0,
    bereiche: l.bereiche ?? [],
    reihenfolge: l.reihenfolge ?? 0,
  }))
}

/** Leistung ändern oder neu anlegen (Recht «preise»). */
export async function speichereLeistung(l: Partial<Omit<Leistung, 'id'>> & { id?: string | undefined }): Promise<void> {
  const werte = {
    ...(l.schluessel !== undefined ? { schluessel: l.schluessel } : {}),
    ...(l.nameDe !== undefined ? { name_de: l.nameDe } : {}),
    ...(l.nameFr !== undefined ? { name_fr: l.nameFr } : {}),
    ...(l.einheit !== undefined ? { einheit: l.einheit } : {}),
    ...(l.kostenRappen !== undefined ? { kosten_rappen: l.kostenRappen } : {}),
    ...(l.verkaufRappen !== undefined ? { verkauf_rappen: l.verkaufRappen } : {}),
    ...(l.bereiche !== undefined ? { bereiche: l.bereiche } : {}),
    ...(l.reihenfolge !== undefined ? { reihenfolge: l.reihenfolge } : {}),
  }
  const { error } = l.id
    ? await db().from('leistungen').update(werte).eq('id', l.id)
    : await db()
        .from('leistungen')
        .insert({
          schluessel: l.schluessel ?? `eigene_${Date.now().toString(36)}`,
          name_de: l.nameDe ?? '',
          name_fr: l.nameFr ?? l.nameDe ?? '',
          verkauf_rappen: l.verkaufRappen ?? 0,
          ...werte,
        })
  if (error) throw error
}

/** Leistung ausblenden (Papierkorb). */
export async function entferneLeistung(id: string) {
  const { error } = await db().from('leistungen').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Bausteine der Kalkulation. */
export async function ladeBausteine(): Promise<Baustein[]> {
  const { data, error } = await db()
    .from('kalk_bausteine')
    .select('id, name_de, name_fr, zeilen, reihenfolge')
    .is('geloescht_am', null)
    .order('reihenfolge')
  if (error) throw error
  return data.map((b) => ({
    id: b.id,
    nameDe: b.name_de,
    nameFr: b.name_fr,
    zeilen: Array.isArray(b.zeilen) ? (b.zeilen as unknown as BausteinZeile[]) : [],
    reihenfolge: b.reihenfolge,
  }))
}

/** Zeilen oder Namen eines Bausteins speichern (neu ohne id). */
export async function speichereBaustein(b: { id?: string; nameDe: string; nameFr: string; zeilen: BausteinZeile[] }) {
  const werte = { name_de: b.nameDe, name_fr: b.nameFr, zeilen: b.zeilen as unknown as NonNullable<Json> }
  const { error } = b.id
    ? await db().from('kalk_bausteine').update(werte).eq('id', b.id)
    : await db().from('kalk_bausteine').insert(werte)
  if (error) throw error
}

/** Baustein in den Papierkorb. */
export async function entferneBaustein(id: string) {
  const { error } = await db().from('kalk_bausteine').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Preisverlauf eines Artikels, neueste zuerst (höchstens 60 Einträge). */
export async function ladePreisverlauf(artikelId: string): Promise<PreisVerlaufEintrag[]> {
  const { data, error } = await db()
    .from('preisverlauf')
    .select('id, feld, alt, neu, quelle, person, erstellt_am, lieferanten(name)')
    .eq('artikel_id', artikelId)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
    .limit(60)
  if (error) throw error
  return data.map((v) => ({
    id: v.id,
    feld: v.feld as PreisVerlaufEintrag['feld'],
    alt: v.alt,
    neu: v.neu,
    quelle: v.quelle,
    person: v.person,
    lieferant: v.lieferanten?.name ?? null,
    am: v.erstellt_am,
  }))
}

/** Wo ein Artikel verwendet wird (offene Kalkulationen, Vorlagen, Projekte der letzten 12 Monate). */
export async function ladeVerwendung(artikelId: string) {
  const { data, error } = await db().rpc('artikel_verwendung', { p_artikel: artikelId })
  if (error) throw error
  const r = (data ?? {}) as Record<string, unknown>
  return {
    kalkulationenOffen: Number(r.kalkulationen_offen ?? 0),
    vorlagen: Array.isArray(r.vorlagen) ? (r.vorlagen as string[]) : [],
    projekte: Number(r.projekte_12_monate ?? 0),
    menge: Number(r.menge_12_monate ?? 0),
  }
}

/** Marge (Anteil) für mehrere Artikel oder den Standard ihrer Kategorie setzen. */
export async function setzeMehrfach(ids: string[], p: { marge?: number; standard?: boolean }) {
  const { data, error } = await db().rpc('artikel_preise_mehrfach', {
    p_ids: ids,
    ...(p.marge !== undefined ? { p_marge: p.marge } : {}),
    p_standard: p.standard ?? false,
  })
  if (error) throw error
  return data
}

/** Richtpreis aus eigenen Offerten ähnlicher Grösse (exkl. MWST). */
export async function ladeRichtpreis(kwp: number, speicher: boolean) {
  const { data, error } = await db().rpc('richtpreis', { p_kwp: kwp, p_speicher: speicher })
  if (error) throw error
  const r = (data ?? {}) as Record<string, unknown>
  return {
    anzahl: Number(r.anzahl ?? 0),
    basis: (r.basis as 'angenommen' | 'alle' | undefined) ?? 'alle',
    vonRappen: r.von_rappen === null || r.von_rappen === undefined ? null : Number(r.von_rappen),
    bisRappen: r.bis_rappen === null || r.bis_rappen === undefined ? null : Number(r.bis_rappen),
  }
}

/** Aktive Personen zur Wahl der Freigabe (Geschäftsleitung). */
export async function ladePersonenKurz(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, name')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}
