import { supabase } from '@/services/supabase'
import type {
  Kampagne,
  MarketingVorlagen,
  Newsletter,
  NewsletterEmpfaenger,
  NewsletterSegment,
  Sprache,
  Zielkontakt,
} from '../types'

/**
 * Datenzugriff «Kunden anschreiben» und Newsletter. Wer nicht angeschrieben wird (abgemeldet, ohne Versandgrund,
 * doppelt, schon erhalten), entscheidet die Datenbank (marketing_senden, newsletter_empfaenger_fuer).
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Ganze Zielgruppe (ein Eintrag je Kontakt). */
export async function ladeZielgruppe(): Promise<Zielkontakt[]> {
  const { data, error } = await db().from('marketing_zielgruppe').select('*').order('name').limit(10000)
  if (error) throw error
  return data as unknown as Zielkontakt[]
}

/** Letzte Aktionen (V233). */
export async function ladeKampagnen(): Promise<Kampagne[]> {
  const { data, error } = await db()
    .from('kampagnen')
    .select('id, art, betreff, anzahl, versendet_am, versendet_von')
    .is('geloescht_am', null)
    .order('versendet_am', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as Kampagne[]
}

/** Vorlagen (Einstellung «marketing»). */
export async function ladeVorlagen(): Promise<MarketingVorlagen> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'marketing').single()
  if (error) throw error
  return data.wert as unknown as MarketingVorlagen
}

/** Vorlagen speichern; den CI-Stil ändert nur die Administration (prüft die Datenbank). */
export async function speichereVorlagen(v: MarketingVorlagen): Promise<void> {
  const { error } = await db()
    .from('einstellungen')
    .update({ wert: v as never })
    .eq('schluessel', 'marketing')
  if (error) throw error
}

/** Eine fertige Mail an einen Empfänger (Platzhalter schon eingesetzt). */
export interface SerienMail {
  kontakt_id?: string | null
  empfaenger_id?: string | null
  an: string
  betreff: string
  text: string
  sprache: Sprache
}

/** Serien-Mail oder Newsletter in den Ausgangskorb (freigegeben). Gibt angelegt und übersprungen zurück. */
export async function senden(p: {
  art: 'serienmail' | 'newsletter'
  betreff: string
  newsletter_id?: string
  details?: Record<string, unknown>
  mails: SerienMail[]
}): Promise<{ angelegt: number; uebersprungen: number }> {
  const { data, error } = await db().rpc('marketing_senden', { p: p as never })
  if (error) throw error
  return data as unknown as { angelegt: number; uebersprungen: number }
}

/** Serienbrief oder Adressliste vermerken (Letzte Aktionen; Briefe auch im Verlauf). */
export async function vermerken(
  art: 'serienbrief' | 'adressliste',
  betreff: string,
  kontakte: string[],
  details: Record<string, unknown> = {},
) {
  const { error } = await db().rpc('marketing_vermerken', {
    p_art: art,
    p_betreff: betreff,
    p_kontakte: kontakte,
    p_details: details as never,
  })
  if (error) throw error
}

/** Kontakt vom Marketing ab- oder wieder anmelden. */
export async function sperre(kontaktId: string, sperren: boolean, grund: string | null) {
  const { error } = await db().rpc('marketing_sperre', {
    p_kontakt: kontaktId,
    p_sperre: sperren,
    ...(grund ? { p_grund: grund } : {}),
  })
  if (error) throw error
}

/** Einwilligung festhalten (Datum, Nachweis). */
export async function einwilligung(kontaktId: string, datum: string, quelle: string) {
  const { error } = await db().rpc('marketing_einwilligung', { p_kontakt: kontaktId, p_datum: datum, p_quelle: quelle })
  if (error) throw error
}

/** Alle Newsletter (neueste zuerst). */
export async function ladeNewsletter(): Promise<Newsletter[]> {
  const { data, error } = await db()
    .from('newsletter')
    .select(
      'id, thema, segment, betreff_de, betreff_fr, text_de, text_fr, status, versendet_am, versendet_von, anzahl, erstellt_am',
    )
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
  if (error) throw error
  return data as unknown as Newsletter[]
}

/** Newsletter anlegen oder ändern; gibt die ID zurück. */
export async function speichereNewsletter(n: {
  id?: string
  thema: string
  segment: NewsletterSegment
  betreff_de: string
  betreff_fr: string
  text_de: string
  text_fr: string
}): Promise<string> {
  const werte = { ...n, segment: n.segment as never }
  if (n.id) {
    const { error } = await db().from('newsletter').update(werte).eq('id', n.id)
    if (error) throw error
    return n.id
  }
  const { data, error } = await db().from('newsletter').insert(werte).select('id').single()
  if (error) throw error
  return data.id
}

/** Newsletter in den Papierkorb (nie hart löschen). */
export async function newsletterPapierkorb(id: string) {
  const { error } = await db().from('newsletter').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Empfänger nach Segment, mit «schon erhalten». */
export async function ladeEmpfaenger(newsletterId: string): Promise<NewsletterEmpfaenger[]> {
  const { data, error } = await db().rpc('newsletter_empfaenger_fuer', { p_newsletter: newsletterId })
  if (error) throw error
  return data as unknown as NewsletterEmpfaenger[]
}

/** Adresse des Abmelde-Links (Edge Function «abmelden») für einen Schlüssel. */
export function abmeldeLink(schluessel: string): string {
  const basis = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
  return `${basis.replace(/\/$/, '')}/functions/v1/abmelden?s=${schluessel}`
}
