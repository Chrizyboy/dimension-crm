import { supabase } from '@/services/supabase'
import type { Filter, Leistung, Vertrag, VertragEingabe, Wartung } from '../types'

/** Datenzugriff für Wartungsverträge. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER =
  'id, nummer, status, kontakt_id, projekt_id, anlage_id, start_am, laufzeit_jahre, rhythmus_monate, preis_rappen, leistungen, letzte_wartung, naechste_wartung, sprache, notiz, verlauf, ' +
  'kontakt:kontakte(vorname, nachname, firma, sprache, objekte(strasse, plz, ort)), projekt:projekte(nummer)'

interface Roh extends Omit<Vertrag, 'kunde' | 'adresse' | 'ort' | 'projekt' | 'leistungen' | 'verlauf' | 'sprache'> {
  sprache: string | null
  leistungen: unknown
  verlauf: unknown
  kontakt: {
    vorname: string | null
    nachname: string | null
    firma: string | null
    sprache: string | null
    objekte: { strasse: string | null; plz: string | null; ort: string | null }[]
  } | null
  projekt: { nummer: string } | null
}

function alsVertrag({ kontakt: k, projekt, leistungen, verlauf, sprache, ...v }: Roh): Vertrag {
  const o = k?.objekte[0]
  const name = k ? k.firma?.trim() || [k.vorname, k.nachname].filter(Boolean).join(' ') || '–' : '–'
  return {
    ...v,
    sprache: (sprache ?? k?.sprache) === 'fr' ? 'fr' : 'de',
    leistungen: Array.isArray(leistungen) ? (leistungen as Leistung[]) : [],
    verlauf: Array.isArray(verlauf) ? (verlauf as Wartung[]) : [],
    kunde: name,
    adresse: [name, o?.strasse, [o?.plz, o?.ort].filter(Boolean).join(' ')].filter((x): x is string => Boolean(x)),
    ort: o?.ort ?? null,
    projekt: projekt?.nummer ?? null,
  }
}

/** Verträge nach Filter; fällig = aktiv und nächste Wartung in den nächsten 30 Tagen oder vorbei. */
export async function ladeVertraege(filter: Filter, bis: string): Promise<Vertrag[]> {
  let q = db().from('wartungsvertraege').select(FELDER).is('geloescht_am', null)
  if (filter !== 'alle') q = q.eq('status', 'aktiv')
  if (filter === 'faellig') q = q.lte('naechste_wartung', bis)
  const { data, error } = await q.order('naechste_wartung', { nullsFirst: false })
  if (error) throw error
  return (data as unknown as Roh[]).map(alsVertrag)
}

/** Ein Vertrag für die Akte. */
export async function ladeVertrag(id: string): Promise<Vertrag> {
  const { data, error } = await db().from('wartungsvertraege').select(FELDER).eq('id', id).single()
  if (error) throw error
  return alsVertrag(data as unknown as Roh)
}

/** Vertrag anlegen (Nummer und erste Wartung setzt die Datenbank) oder ändern; gibt die ID zurück. */
export async function vertragSpeichern(e: VertragEingabe, id?: string): Promise<string> {
  const felder = { ...e, leistungen: e.leistungen as never }
  if (id) {
    const { error } = await db().from('wartungsvertraege').update(felder).eq('id', id)
    if (error) throw error
    return id
  }
  const { data, error } = await db().from('wartungsvertraege').insert(felder).select('id').single()
  if (error) throw error
  return data.id
}

/** Wartung durchgeführt; gibt die nächste Wartung zurück. */
export async function wartungErledigt(id: string, am: string, notiz: string): Promise<string> {
  const { data, error } = await db().rpc('wartung_erledigt', { p_id: id, p_am: am, p_notiz: notiz })
  if (error) throw error
  return data
}

/** Leistungskatalog aus den Einstellungen (Regel 8: Daten statt Code). */
export async function ladeKatalog(): Promise<Leistung[]> {
  const { data, error } = await db()
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'wartung_leistungen')
    .maybeSingle()
  if (error) throw error
  return Array.isArray(data?.wert) ? (data.wert as unknown as Leistung[]) : []
}

/** Projekte eines Kunden für die Zuordnung. */
export async function ladeKundenProjekte(kontaktId: string): Promise<{ id: string; nummer: string }[]> {
  const { data, error } = await db()
    .from('projekte')
    .select('id, nummer')
    .eq('kontakt_id', kontaktId)
    .is('geloescht_am', null)
  if (error) throw error
  return data
}
