import { supabase } from '@/services/supabase'
import type { Json, TablesInsert, TablesUpdate } from '@/types/datenbank'
import type {
  Eingang,
  Finanzdaten,
  Fixkosten,
  LiquiditaetEinstellungen,
  MaterialPosition,
  OffeneRechnung,
  OffeneTranche,
} from '../types'

/**
 * Datenzugriff der Finanzen. Alle Tabellen hier liest und ändert nur, wer das Recht «finanzen» hat
 * (prüft die Datenbank). Gelöscht wird nie hart, sondern in den Papierkorb (geloescht_am).
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const EINSTELLUNG = 'vorlage.main'

/** Alles für Übersicht und Listen in einem Zug. */
export async function ladeFinanzen(): Promise<Finanzdaten> {
  const [z, m, f, e, r, t, s] = await Promise.all([
    db().from('kreditor_zahlungen').select('*').is('geloescht_am', null),
    db().from('material_zahlungen').select('*').is('geloescht_am', null),
    db().from('fixkosten').select('*').is('geloescht_am', null).order('gruppe').order('bezeichnung'),
    db().from('erwartete_eingaenge').select('*').is('geloescht_am', null),
    db()
      .from('rechnungen_liste')
      .select('id, nummer, kunde, projekt_nummer, titel, offen_rappen, faellig_am')
      .in('status', ['gestellt', 'teilbezahlt']),
    db().from('offene_tranchen').select('id, kunde, projekt_nummer, bezeichnung, betrag_rappen, faellig_am'),
    db().from('finanz_einstellungen').select('wert').eq('schluessel', EINSTELLUNG).maybeSingle(),
  ])
  for (const x of [z, m, f, e, r, t, s]) if (x.error) throw x.error
  const einstellungen = (s.data?.wert ?? {}) as LiquiditaetEinstellungen
  const seit = einstellungen.saldo?.datum
  let kundenzahlungen: Finanzdaten['kundenzahlungen'] = []
  if (seit) {
    const k = await db()
      .from('rechnung_zahlungen')
      .select('datum, betrag_rappen')
      .is('geloescht_am', null)
      .gt('datum', seit)
    if (k.error) throw k.error
    kundenzahlungen = k.data
  }
  return {
    zahlungen: z.data ?? [],
    material: (m.data ?? []).map((x) => ({
      ...x,
      positionen: x.positionen as unknown as MaterialPosition[],
    })),
    fixkosten: f.data as Fixkosten[],
    eingaenge: e.data as Eingang[],
    rechnungen: r.data as unknown as OffeneRechnung[],
    tranchen: t.data as unknown as OffeneTranche[],
    kundenzahlungen,
    einstellungen,
  }
}

/** Einstellungen der Liquidität ändern (Kontostand, Wochen, Vorlauf, Reserve, Anpassungen). */
export async function einstellungenSpeichern(alt: LiquiditaetEinstellungen, neu: Partial<LiquiditaetEinstellungen>) {
  const wert = { ...alt, ...neu }
  const { data, error } = await db()
    .from('finanz_einstellungen')
    .update({ wert: wert as never })
    .eq('schluessel', EINSTELLUNG)
    .select('id')
  if (error) throw error
  if (data.length === 0) {
    const neuEintrag = await db()
      .from('finanz_einstellungen')
      .insert({ schluessel: EINSTELLUNG, wert: wert as never })
    if (neuEintrag.error) throw neuEintrag.error
  }
}

/** Zahlung anlegen (id null) oder ändern. */
export async function zahlungSpeichern(id: string | null, p: TablesUpdate<'kreditor_zahlungen'>): Promise<void> {
  const { error } = id
    ? await db().from('kreditor_zahlungen').update(p).eq('id', id)
    : await db()
        .from('kreditor_zahlungen')
        .insert({ quelle: 'crm', geprueft: true, ...p } as TablesInsert<'kreditor_zahlungen'>)
  if (error) throw error
}

/** Zahlungen als bezahlt markieren (auch mehrere aus dem Zahllauf). */
export async function zahlungenBezahlt(ids: string[], datum: string): Promise<void> {
  const { error } = await db()
    .from('kreditor_zahlungen')
    .update({ status: 'bezahlt', bezahlt_am: datum, offen_rappen: 0 })
    .in('id', ids)
  if (error) throw error
}

/** Zahlungen für ein Datum einplanen (Zahllauf, «Datum»). */
export async function zahlungenPlanen(ids: string[], datum: string | null): Promise<void> {
  const { error } = await db().from('kreditor_zahlungen').update({ geplant_am: datum }).in('id', ids)
  if (error) throw error
}

/**
 * Fixkosten eines Monats bezahlt oder verschoben: wird als Zahlung mit Bezug auf die Fixkosten erfasst,
 * damit der Termin in der Vorschau nicht doppelt erscheint.
 */
export async function fixkostenErfassen(
  f: Fixkosten,
  monat: string,
  a: { bezahlt_am: string } | { geplant_am: string },
): Promise<void> {
  const bezahlt = 'bezahlt_am' in a
  const { error } = await db()
    .from('kreditor_zahlungen')
    .insert({
      firma: f.bezeichnung ?? f.gruppe ?? '',
      text: [f.gruppe, f.detail].filter(Boolean).join(' · ') || null,
      kategorie: f.gruppe === 'Löhne' ? 'Lohn' : (f.gruppe ?? 'Sonstiges'),
      betrag_rappen: f.betrag_rappen,
      faellig_am: `${monat}-${String(Math.min(28, Math.max(1, f.tag ?? 25))).padStart(2, '0')}`,
      fixkosten_id: f.id,
      monat,
      quelle: 'fixkosten',
      geprueft: true,
      status: bezahlt ? 'bezahlt' : 'offen',
      ...(bezahlt ? { bezahlt_am: a.bezahlt_am, offen_rappen: 0 } : { geplant_am: a.geplant_am }),
    })
  if (error) throw error
}

/** Material einer Baustelle anlegen oder ändern (Positionen als Ganzes). */
export async function materialSpeichern(
  id: string | null,
  p: Omit<TablesUpdate<'material_zahlungen'>, 'positionen'> & { positionen?: MaterialPosition[] },
): Promise<void> {
  const { positionen, ...rest } = p
  const daten = { ...rest, ...(positionen ? { positionen: positionen as unknown as Json[] } : {}) }
  const { error } = id
    ? await db().from('material_zahlungen').update(daten).eq('id', id)
    : await db()
        .from('material_zahlungen')
        .insert({ quelle: 'crm', ...daten } as TablesInsert<'material_zahlungen'>)
  if (error) throw error
}

/** Fixkosten anlegen oder ändern. */
export async function fixkostenSpeichern(id: string | null, p: TablesUpdate<'fixkosten'>): Promise<void> {
  const { error } = id
    ? await db().from('fixkosten').update(p).eq('id', id)
    : await db()
        .from('fixkosten')
        .insert({ quelle: 'crm', ...p } as TablesInsert<'fixkosten'>)
  if (error) throw error
}

/** Erwarteten Eingang anlegen oder ändern. */
export async function eingangSpeichern(id: string | null, p: TablesUpdate<'erwartete_eingaenge'>): Promise<void> {
  const { error } = id
    ? await db().from('erwartete_eingaenge').update(p).eq('id', id)
    : await db()
        .from('erwartete_eingaenge')
        .insert({ quelle: 'crm', geprueft: true, ...p } as TablesInsert<'erwartete_eingaenge'>)
  if (error) throw error
}

const TABELLEN = {
  zahlung: 'kreditor_zahlungen',
  material: 'material_zahlungen',
  fix: 'fixkosten',
  eingang: 'erwartete_eingaenge',
} as const

/** In den Papierkorb (wiederherstellbar). */
export async function inPapierkorb(art: keyof typeof TABELLEN, id: string): Promise<void> {
  const { error } = await db().from(TABELLEN[art]).update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Projekte für Zuordnung und Nachkalkulation (Nummer, Titel, Kunde). */
export async function ladeProjekte(): Promise<
  { id: string; nummer: string; titel: string | null; kunde: string | null }[]
> {
  const { data, error } = await db()
    .from('projekte')
    .select('id, nummer, titel, kontakt:kontakte(vorname, nachname, firma)')
    .is('geloescht_am', null)
    .order('nummer', { ascending: false })
    .limit(2000)
  if (error) throw error
  return data.map((p) => ({
    id: p.id,
    nummer: p.nummer,
    titel: p.titel,
    kunde: p.kontakt.firma || [p.kontakt.vorname, p.kontakt.nachname].filter(Boolean).join(' ') || null,
  }))
}

/** Nachkalkulation eines Projekts (Soll aus Kalkulation, Ist aus Material, Zeiten, Nachträgen, Rechnungen). */
export async function ladeNachkalkulation(projektId: string): Promise<Nachkalkulation> {
  const { data, error } = await db().rpc('nachkalkulation', { p_projekt: projektId })
  if (error) throw error
  return data as unknown as Nachkalkulation
}

/** Ergebnis von public.nachkalkulation. */
export interface Nachkalkulation {
  projekt_id: string
  nummer: string
  soll: {
    verkauf_rappen: number | null
    einkauf_rappen: number | null
    werktage: number | null
    stunden: number | null
  }
  ist: {
    vertrag_rappen: number
    nachtraege_rappen: number
    umsatz_rappen: number
    verrechnet_rappen: number
    material_rappen: number
    material_quelle: string
    stunden: number
    arbeit_rappen: number
    marge_rappen: number
  }
}
