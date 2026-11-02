import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { Freigabe, KalkPosition, Kalkulation, Preisvorlage, Variante } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

function positionenAus(roh: Json | null): KalkPosition[] {
  return Array.isArray(roh) ? (roh as unknown as KalkPosition[]) : []
}

/** Gespeicherte Kalkulationen, zuletzt geänderte zuerst. */
export async function ladeKalkulationen(): Promise<
  (Kalkulation & { id: string; totalRappen: number | null; offerteNummer: string | null })[]
> {
  const { data, error } = await db()
    .from('kalkulationen')
    .select(
      'id, titel, offerte_id, rabatt, notiz, positionen, varianten, variante, freigabe, total_rappen, geaendert_am, offerten(nummer)',
    )
    .is('geloescht_am', null)
    .order('geaendert_am', { ascending: false })
  if (error) throw error
  return data.map((k) => ({
    id: k.id,
    titel: k.titel ?? '',
    offerteId: k.offerte_id,
    rabattProzent: k.rabatt ?? 0,
    notiz: k.notiz ?? '',
    positionen: positionenAus(k.positionen),
    varianten: Array.isArray(k.varianten) ? (k.varianten as unknown as Variante[]) : [],
    variante: k.variante,
    freigabe: (k.freigabe ?? null) as Freigabe | null,
    geaendertAm: k.geaendert_am,
    totalRappen: k.total_rappen,
    offerteNummer: k.offerten?.nummer ?? null,
  }))
}

/** Kalkulation speichern (neu oder ändern) mit den Summen für Listen und Auswertungen. */
export async function speichereKalkulation(
  k: Kalkulation,
  s: { netto: number; total: number; brutto: number; ek: number; kwp: number },
): Promise<string> {
  const werte = {
    titel: k.titel,
    offerte_id: k.offerteId,
    rabatt: k.rabattProzent,
    notiz: k.notiz,
    positionen: k.positionen as unknown as NonNullable<Json>,
    varianten: (k.varianten ?? []) as unknown as NonNullable<Json>,
    variante: k.varianten?.length ? (k.variante ?? k.varianten[0]?.id ?? null) : null,
    leistung_kwp: s.kwp || null,
    netto_rappen: s.netto,
    total_rappen: s.total,
    verkauf_rappen: s.brutto,
    einkauf_rappen: s.ek,
  }
  if (k.id) {
    const { error } = await db().from('kalkulationen').update(werte).eq('id', k.id)
    if (error) throw error
    return k.id
  }
  const { data, error } = await db().from('kalkulationen').insert(werte).select('id').single()
  if (error) throw error
  return data.id
}

/** Kalkulation in den Papierkorb (nie hart löschen). */
export async function entferneKalkulation(id: string) {
  const { error } = await db().from('kalkulationen').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Vorlagen mit ihren Artikeln und Mengen. */
export async function ladeVorlagen(): Promise<Preisvorlage[]> {
  const { data, error } = await db()
    .from('preisvorlagen')
    .select('id, name, system, preisvorlage_positionen(artikel_id, menge, reihenfolge, geloescht_am)')
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data.map((v) => ({
    id: v.id,
    name: v.name,
    system: v.system,
    positionen: v.preisvorlage_positionen
      .filter((p) => !p.geloescht_am)
      .sort((a, b) => a.reihenfolge - b.reihenfolge)
      .map((p) => ({ artikelId: p.artikel_id, menge: p.menge })),
  }))
}

/** «Als Vorlage speichern»: Artikel aus der Preisliste mit ihren Mengen. */
export async function speichereVorlage(name: string, positionen: { artikelId: string; menge: number }[]) {
  const { data, error } = await db().from('preisvorlagen').insert({ name, quelle: 'Kalkulation' }).select('id').single()
  if (error) throw error
  const { error: f } = await db()
    .from('preisvorlage_positionen')
    .insert(
      positionen.map((p, i) => ({
        preisvorlage_id: data.id,
        artikel_id: p.artikelId,
        menge: p.menge,
        reihenfolge: i + 1,
      })),
    )
  if (f) throw f
}

/** Offerten zur Auswahl (Nummer und Name), neueste zuerst. */
export async function ladeOffertAuswahl(): Promise<{ id: string; nummer: string; name: string }[]> {
  const { data, error } = await db()
    .from('offerten_liste')
    .select('id, nummer, name')
    .order('nummer', { ascending: false })
    .limit(400)
  if (error) throw error
  return data.map((o) => ({ id: o.id ?? '', nummer: o.nummer ?? '', name: o.name ?? '' }))
}

/**
 * «In Offerte übernehmen» (gespeicherte Kalkulation, gewählte Variante): Betrag exkl. MWST, kWp, Module,
 * Wechselrichter und Batterie. Die Datenbank prüft vorher die Freigabe (Rabatt, Marge).
 */
export async function uebernimmInOfferte(kalkulationId: string) {
  const { error } = await db().rpc('kalkulation_in_offerte', { p_kalk: kalkulationId })
  if (error) throw error
}

/** Stand der Freigabe einer gespeicherten Kalkulation. */
export async function pruefeFreigabe(kalkulationId: string) {
  const { data, error } = await db().rpc('kalkulation_freigabe_pruefen', { p_kalk: kalkulationId })
  if (error) throw error
  const r = (data ?? {}) as Record<string, unknown>
  return {
    noetig: r.noetig === true,
    freigegeben: r.freigegeben === true,
    gruende: Array.isArray(r.gruende) ? (r.gruende as string[]) : [],
    status: (r.status as string | null) ?? null,
  }
}

/** Freigabe bei der Geschäftsleitung anfragen (Glocke). */
export async function frageFreigabe(kalkulationId: string, notiz: string) {
  const { error } = await db().rpc('kalkulation_freigabe_anfragen', { p_kalk: kalkulationId, p_notiz: notiz })
  if (error) throw error
}

/** Freigeben oder ablehnen (nur Geschäftsleitung); Ablehnen braucht einen Grund. */
export async function entscheideFreigabe(kalkulationId: string, ok: boolean, grund: string) {
  const { error } = await db().rpc('kalkulation_freigeben', { p_kalk: kalkulationId, p_ok: ok, p_grund: grund })
  if (error) throw error
}
