import { supabase } from '@/services/supabase'
import type { CamtBuchung } from '../lib/camt'
import type { Pruefung } from '../types'

/**
 * Abläufe der Finanzen, deren Regeln in der Datenbank liegen (Entscheid 0039): Visum und Freigabe der
 * Lieferantenrechnungen, Zahllauf mit zweiter Person, Kontoauszug, MWST, Marge, Monatsabschluss.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Rechnung, die auf mein Visum wartet (Projektleitung, ohne Finanzzahlen). */
export interface VisumRechnung {
  id: string
  lieferant: string
  rechnung_nr: string | null
  rechnung_am: string | null
  betrag_rappen: number | null
  faellig_am: string | null
  text: string | null
  projekt_id: string
  projekt_nummer: string
  projekt_titel: string | null
  bestellung_nummer: string | null
  bestellung_rappen: number | null
}

/** Rechnungen meiner Projekte, die auf das Visum warten. */
export async function ladeVisum(): Promise<VisumRechnung[]> {
  const { data, error } = await db().rpc('kreditor_visum_liste')
  if (error) throw error
  return data as VisumRechnung[]
}

/** Visum: stimmt oder stimmt nicht (dann mit Grund). */
export async function visumGeben(id: string, ok: boolean, notiz: string | null): Promise<void> {
  const { error } = await db().rpc('kreditor_visum', { p_id: id, p_ok: ok, p_notiz: notiz ?? undefined })
  if (error) throw error
}

/** Prüfschritt setzen (Buchhaltung): freigeben, zurückhalten, zu klären, zurück zum Visum. */
export async function pruefungSetzen(id: string, schritt: Pruefung, notiz?: string): Promise<void> {
  const { error } = await db().rpc('kreditor_pruefung', { p_id: id, p_schritt: schritt, p_notiz: notiz })
  if (error) throw error
}

/** Zahllauf vorbereiten; die Freigabe macht eine zweite Person. */
export async function zahllaufAnlegen(p: {
  firma: string
  konto: string | null
  datum: string
  ids: string[]
  notiz?: string
}): Promise<string> {
  const { data, error } = await db().rpc('zahllauf_anlegen', {
    p_firma: p.firma,
    p_konto: p.konto ?? undefined,
    p_datum: p.datum,
    p_ids: p.ids,
    p_notiz: p.notiz,
  })
  if (error) throw error
  return data
}

/** Zahllauf freigeben, verwerfen oder als ausgeführt melden. */
export async function zahllaufSchritt(id: string, schritt: 'freigeben' | 'verwerfen' | 'erledigt'): Promise<void> {
  const fn = ({ freigeben: 'zahllauf_freigeben', verwerfen: 'zahllauf_verwerfen', erledigt: 'zahllauf_erledigt' } as const)[
    schritt
  ]
  const { error } = await db().rpc(fn, { p_id: id })
  if (error) throw error
}

/** Konto anlegen oder ändern (Name, IBAN, Stand von Hand). */
export async function kontoSpeichern(
  id: string | null,
  p: {
    firma_id: string
    name: string
    iban: string | null
    stand_rappen: number | null
    stand_am: string | null
    aktiv: boolean
  },
): Promise<void> {
  const { error } = id
    ? await db().from('finanz_konten').update(p).eq('id', id)
    : await db().from('finanz_konten').insert(p)
  if (error) throw error
}

/** Kontoauszug übernehmen; gibt neue Buchungen und erkannte Zahlungen zurück. */
export async function auszugEinlesen(
  konto: string,
  stand_rappen: number | null,
  stand_am: string | null,
  buchungen: CamtBuchung[],
): Promise<{ neu: number; bezahlt: number }> {
  const { data, error } = await db().rpc('kontoauszug_einlesen', {
    p_konto: konto,
    p_stand_rappen: stand_rappen ?? undefined,
    p_stand_am: stand_am ?? undefined,
    p_buchungen: buchungen as never,
  })
  if (error) throw error
  return data as { neu: number; bezahlt: number }
}

/** Letzte Buchungen eines Kontos. */
export async function ladeBuchungen(konto: string) {
  const { data, error } = await db()
    .from('konto_buchungen')
    .select('id, datum, betrag_rappen, text, gegenpartei, referenz, kreditor_id')
    .eq('konto_id', konto)
    .is('geloescht_am', null)
    .order('datum', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

/** Verbindlichen MWST-Betrag aus AbaNinja erfassen (ersetzt die Schätzung) oder als bezahlt melden. */
export async function mwstErfassen(p: {
  firma_id: string
  periode: string
  betrag_rappen: number
  faellig_am: string
  bezahlt_am: string | null
}): Promise<void> {
  const alt = await db()
    .from('mwst_abrechnungen')
    .select('id')
    .eq('firma_id', p.firma_id)
    .eq('periode', p.periode)
    .is('geloescht_am', null)
    .maybeSingle()
  if (alt.error) throw alt.error
  const { error } = alt.data
    ? await db().from('mwst_abrechnungen').update(p).eq('id', alt.data.id)
    : await db().from('mwst_abrechnungen').insert(p)
  if (error) throw error
}

/** Zeile aus marge_uebersicht() (Beträge exkl. MWST). */
export interface MargeZeile {
  projekt_id: string
  nummer: string
  titel: string | null
  kunde: string | null
  status: string
  firma_id: string | null
  produkt: 'pv' | 'waermepumpe' | 'batterie' | 'andere'
  unterzeichnet_am: string | null
  umsatz_rappen: number
  verrechnet_rappen: number
  bezahlt_rappen: number
  kosten_rappen: number
  material_rappen: number
  arbeit_rappen: number
  soll_verkauf_rappen: number | null
  soll_einkauf_rappen: number | null
  schlussrechnung: boolean
}

/** Marge aller Projekte in einer Abfrage. */
export async function ladeMarge(): Promise<MargeZeile[]> {
  const { data, error } = await db().rpc('marge_uebersicht')
  if (error) throw error
  return data as MargeZeile[]
}

/** Stand der Abschluss-Liste eines Monats («2026-10»). */
export interface AbschlussStand {
  von: string
  bis: string
  konten_alt: number
  abaninja_am: string | null
  ohne_zuordnung: number
  ohne_firma: number
  pruefung_offen: number
  spesen_offen: number
  tranchen_offen: number
  zeiten_offen: number
  abschluss: { bestaetigt_von: string; bestaetigt_am: string; offen: string[] } | null
}

export async function ladeAbschluss(monat: string): Promise<AbschlussStand> {
  const { data, error } = await db().rpc('monatsabschluss_stand', { p_monat: monat })
  if (error) throw error
  return data as unknown as AbschlussStand
}

/** Monat abschliessen; noch offene Punkte werden mitgespeichert. */
export async function abschlussBestaetigen(monat: string, offen: string[], notiz: string | null): Promise<void> {
  const { error } = await db().from('monatsabschluesse').insert({ monat, offen, notiz })
  if (error) throw error
}
