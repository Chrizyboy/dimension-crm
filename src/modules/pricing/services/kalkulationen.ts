import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { KalkPosition, Kalkulation, Preisvorlage } from '../types'

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
    .select('id, titel, offerte_id, rabatt, notiz, positionen, total_rappen, geaendert_am, offerten(nummer)')
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

/** «In Offerte übernehmen»: Betrag exkl. MWST, kWp, Module, Wechselrichter und Batterie. */
export async function uebernimmInOfferte(offerteId: string, werte: Record<string, unknown>) {
  const { error } = await db().rpc('offerte_werte_setzen', {
    p_offerte: offerteId,
    p: werte as Json,
    p_quelle: 'kalkulation',
  })
  if (error) throw error
}
