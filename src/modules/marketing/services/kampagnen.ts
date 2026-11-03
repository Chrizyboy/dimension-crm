import { supabase } from '@/services/supabase'
import type {
  BudgetZeile,
  Kampagne,
  GespeicherteZielgruppe,
  KampagnenLead,
  KampagnenZahlen,
  Kostenbeleg,
  QuellenZeile,
  VersandErgebnis,
  Werbekampagne,
  Werbemittel,
  ZielFilter,
} from '../types'

/**
 * Datenzugriff Kampagnen, Messen, Zielgruppen, Werbemittel und Kosten (Entscheid 0049). Zahlen, Kosten und die
 * Zuordnung der Kampagne zum Lead rechnet die Datenbank (kampagnen_zahlen, marketing_quellen, kampagne_zuordnen).
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const KAMPAGNE =
  'id, name, art, status, ziel, start_am, ende_am, budget_rappen, ziel_leads, sprache, standort_id, verantwortlich_id, kennzeichen, quelle, details, notiz'

/** Alle Kampagnen, neueste zuerst. */
export async function ladeWerbekampagnen(): Promise<Werbekampagne[]> {
  const { data, error } = await db()
    .from('marketing_kampagnen')
    .select(KAMPAGNE)
    .is('geloescht_am', null)
    .order('start_am', { ascending: false, nullsFirst: true })
  if (error) throw error
  return data as unknown as Werbekampagne[]
}

/** Kampagne speichern (neu oder ändern); gibt die ID zurück. */
export async function speichereKampagne(k: Partial<Werbekampagne> & { name: string }): Promise<string> {
  const { id, ...werte } = k
  if (id) {
    const { error } = await db()
      .from('marketing_kampagnen')
      .update(werte as never)
      .eq('id', id)
    if (error) throw error
    return id
  }
  const { data, error } = await db()
    .from('marketing_kampagnen')
    .insert(werte as never)
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Kampagne in den Papierkorb. */
export async function kampagnePapierkorb(id: string) {
  const { error } = await db()
    .from('marketing_kampagnen')
    .update({ geloescht_am: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Zahlen je Kampagne. */
export async function ladeKampagnenZahlen(): Promise<KampagnenZahlen[]> {
  const { data, error } = await db().rpc('kampagnen_zahlen')
  if (error) throw error
  return data
}

/** «Woher kommen die Aufträge?» für ein Jahr. */
export async function ladeQuellen(jahr: number): Promise<QuellenZeile[]> {
  const { data, error } = await db().rpc('marketing_quellen', { p_jahr: jahr })
  if (error) throw error
  return data
}

/** Budget und Kosten je Kanal (leer ohne Recht). */
export async function ladeBudget(jahr: number): Promise<BudgetZeile[]> {
  const { data, error } = await db().rpc('marketing_budget', { p_jahr: jahr })
  if (error) throw error
  return data as unknown as BudgetZeile[]
}

const LEAD =
  'id, nummer, kontakt_id, kampagne_id, quelle, eingang_am, stufe, tour_person_id, kontakte!verkaufschancen_kontakt_id_fkey(vorname, nachname, firma, email), objekte(ort)'

type LeadRoh = Omit<KampagnenLead, 'name' | 'ort' | 'email'> & {
  kontakte: { vorname: string | null; nachname: string | null; firma: string | null; email: string | null } | null
  objekte: { ort: string | null } | null
}
const alsLead = (r: LeadRoh): KampagnenLead => ({
  id: r.id,
  nummer: r.nummer,
  kontakt_id: r.kontakt_id,
  kampagne_id: r.kampagne_id,
  quelle: r.quelle,
  eingang_am: r.eingang_am,
  stufe: r.stufe,
  tour_person_id: r.tour_person_id,
  name: [r.kontakte?.vorname, r.kontakte?.nachname].filter(Boolean).join(' ') || r.kontakte?.firma || r.nummer,
  ort: r.objekte?.ort ?? null,
  email: r.kontakte?.email ?? null,
})

/** Leads mit Kampagne (alle, neueste zuerst; höchstens 2000). */
export async function ladeKampagnenLeads(): Promise<KampagnenLead[]> {
  const { data, error } = await db()
    .from('verkaufschancen')
    .select(LEAD)
    .not('kampagne_id', 'is', null)
    .is('geloescht_am', null)
    .order('eingang_am', { ascending: false, nullsFirst: false })
    .limit(2000)
  if (error) throw error
  return (data as unknown as LeadRoh[]).map(alsLead)
}

/** Kampagne eines Leads von Hand setzen oder entfernen. */
export async function leadKampagneSetzen(leadId: string, kampagneId: string | null) {
  const { error } = await db().from('verkaufschancen').update({ kampagne_id: kampagneId }).eq('id', leadId)
  if (error) throw error
}

/** Ergebnis je Versand (gesendet, geöffnet, geklickt, abgemeldet, Leads). */
export async function ladeVersandErgebnisse(ids: string[]): Promise<VersandErgebnis[]> {
  if (!ids.length) return []
  const { data, error } = await db().rpc('versand_ergebnisse', { p_ids: ids })
  if (error) throw error
  return data
}

/** Versände (Letzte Aktionen) mit Kampagne und Newsletter, für Akte und Newsletter-Ergebnis. */
export async function ladeVersaende(): Promise<
  {
    id: string
    art: Kampagne['art']
    betreff: string | null
    anzahl: number | null
    versendet_am: string | null
    kampagne_id: string | null
    newsletter_id: string | null
  }[]
> {
  const { data, error } = await db()
    .from('kampagnen')
    .select('id, art, betreff, anzahl, versendet_am, kampagne_id, newsletter_id')
    .is('geloescht_am', null)
    .order('versendet_am', { ascending: false })
    .limit(500)
  if (error) throw error
  return data as never
}

/** Lieferantenrechnungen, die nach Werbung aussehen und noch nicht zugeordnet sind (nur Recht Finanzen). */
export async function ladeKostenOffen(): Promise<Kostenbeleg[]> {
  const { data, error } = await db().rpc('marketing_kosten_offen')
  if (error) throw error
  return data
}

/** Rechnungen einer Kampagne (nur Recht Finanzen sieht sie, sonst leer). */
export async function ladeKostenDerKampagne(kampagneId: string): Promise<Kostenbeleg[]> {
  const { data, error } = await db()
    .from('kreditor_zahlungen')
    .select('id, firma, text, kategorie, rechnung_nr, rechnung_am, betrag_rappen, kampagne_id, marketing_kanal')
    .eq('kampagne_id', kampagneId)
    .is('geloescht_am', null)
    .order('rechnung_am', { ascending: false })
  if (error) throw error
  return data
}

/** Rechnung zuordnen (Kanal «kein» = keine Werbung). */
export async function kostenZuordnen(id: string, kampagneId: string | null, kanal: string) {
  const { error } = await db().rpc('marketing_kosten_zuordnen', {
    p_id: id,
    p_kanal: kanal,
    ...(kampagneId ? { p_kampagne: kampagneId } : {}),
  } as never)
  if (error) throw error
}

/** Messe-Lead speichern (wiederholbar mit ID vom Gerät). */
export async function messeLeadSenden(p: Record<string, unknown>): Promise<string> {
  const { data, error } = await db().rpc('messe_lead_erfassen', { p: p as never })
  if (error) throw error
  return data
}

/** Gespeicherte Zielgruppen. */
export async function ladeZielgruppen(): Promise<GespeicherteZielgruppe[]> {
  const { data, error } = await db()
    .from('marketing_zielgruppen')
    .select('id, name, beschreibung, filter, zuletzt_am')
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data as unknown as GespeicherteZielgruppe[]
}

export async function speichereZielgruppe(name: string, filter: ZielFilter, beschreibung: string | null) {
  const { error } = await db()
    .from('marketing_zielgruppen')
    .insert({ name, filter: filter as never, beschreibung })
  if (error) throw error
}

export async function zielgruppeGenutzt(id: string) {
  const { error } = await db()
    .from('marketing_zielgruppen')
    .update({ zuletzt_am: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function zielgruppePapierkorb(id: string) {
  const { error } = await db()
    .from('marketing_zielgruppen')
    .update({ geloescht_am: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Werbemittel. */
export async function ladeWerbemittel(): Promise<Werbemittel[]> {
  const { data, error } = await db()
    .from('werbemittel')
    .select('id, name, art, sprache, version, link, bestand, mindestbestand, notiz')
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data as unknown as Werbemittel[]
}

export async function speichereWerbemittel(w: Partial<Werbemittel> & { name: string }) {
  const { id, ...werte } = w
  const q = id
    ? db()
        .from('werbemittel')
        .update(werte as never)
        .eq('id', id)
    : db()
        .from('werbemittel')
        .insert(werte as never)
  const { error } = await q
  if (error) throw error
}

export async function werbemittelPapierkorb(id: string) {
  const { error } = await db().from('werbemittel').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Personen für Standdienst und Verantwortlich (aktiv, ohne Montage-Ansicht). */
export async function ladePersonen(): Promise<{ id: string; name: string; kurzzeichen: string | null }[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, name, kurzzeichen')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}
