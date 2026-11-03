import { supabase } from '@/services/supabase'
import type { Mailzeile, Nachverkauf } from '../types'

/** Wirft verständlich, wenn keine Datenbank verbunden ist (Vorschau). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Wie viele Mails die Akte höchstens zeigt; ältere stehen im Posteingang bzw. Ausgangskorb. */
const MAILS = 50

/**
 * Lädt, was nach dem Verkauf an einem Kontakt hängt: Anlagen (über die Gebäude), Service-Fälle, Wartungsverträge,
 * Rechnungen, offene Aufgaben (am Kontakt oder an einem seiner Geschäfte) und die letzten Mails. Ohne Recht auf eine
 * Tabelle liefert die Datenbank (RLS) einfach nichts, die Akte zeigt dann den Block leer statt eines Fehlers.
 */
export async function ladeNachverkauf(
  kontaktId: string,
  objektIds: string[],
  bezugIds: string[],
): Promise<Nachverkauf> {
  const c = db()
  const [anlagen, faelle, vertraege, rechnungen, aufgaben, ein, aus] = await Promise.all([
    objektIds.length
      ? c.from('anlagen').select('*').in('objekt_id', objektIds).is('geloescht_am', null).order('ibn_am')
      : Promise.resolve({ data: [], error: null }),
    c
      .from('service_faelle')
      .select('id, nummer, titel, status, kategorie, garantie, termin_am, erledigt_am, erstellt_am, anlage_id')
      .eq('kontakt_id', kontaktId)
      .is('geloescht_am', null)
      .order('erstellt_am', { ascending: false }),
    c
      .from('wartungsvertraege')
      .select('id, nummer, paket, status, preis_netto_rappen, naechste_wartung, start_am, laufzeit_jahre, anlage_id')
      .eq('kontakt_id', kontaktId)
      .is('geloescht_am', null)
      .order('start_am', { ascending: false }),
    c
      .from('rechnungen_liste')
      .select(
        'id, nummer, titel, status, datum, faellig_am, total_rappen, offen_rappen, bezahlt_rappen, bezahlt_am, mahnstufe, ueberfaellig',
      )
      .eq('kontakt_id', kontaktId)
      .order('datum', { ascending: false, nullsFirst: true }),
    c
      .from('aufgaben')
      .select('id, titel, text, faellig_am, person_id, bezug_tabelle, bezug_id')
      .in('bezug_id', [kontaktId, ...bezugIds])
      .is('erledigt_am', null)
      .is('geloescht_am', null)
      .order('faellig_am', { nullsFirst: false }),
    c
      .from('posteingang')
      .select('id, eingang_am, betreff, von_name, stand')
      .eq('kontakt_id', kontaktId)
      .is('geloescht_am', null)
      .order('eingang_am', { ascending: false })
      .limit(MAILS),
    c
      .from('ausgangskorb')
      .select('id, erstellt_am, gesendet_am, betreff, an, status')
      .eq('kontakt_id', kontaktId)
      .is('geloescht_am', null)
      .order('erstellt_am', { ascending: false })
      .limit(MAILS),
  ])
  for (const r of [anlagen, faelle, vertraege, rechnungen, aufgaben, ein, aus]) if (r.error) throw r.error
  const mails: Mailzeile[] = [
    ...(ein.data ?? []).map((m) => ({
      id: m.id,
      richtung: 'ein' as const,
      zeitpunkt: m.eingang_am,
      betreff: m.betreff ?? '',
      wer: m.von_name,
      status: m.stand,
    })),
    ...(aus.data ?? []).map((m) => ({
      id: m.id,
      richtung: 'aus' as const,
      zeitpunkt: m.gesendet_am ?? m.erstellt_am,
      betreff: m.betreff ?? '',
      wer: m.an,
      status: m.status,
    })),
  ]
  return {
    anlagen: anlagen.data ?? [],
    serviceFaelle: faelle.data ?? [],
    wartungsvertraege: vertraege.data ?? [],
    rechnungen: rechnungen.data ?? [],
    aufgaben: aufgaben.data ?? [],
    mails,
  }
}

/** Namen der Personen (für «wer» bei Aufgaben), auch ausgetretene, damit alte Aufgaben einen Namen zeigen. */
export async function ladePersonenNamen(): Promise<Record<string, string>> {
  const { data, error } = await db().from('personen').select('id, name')
  if (error) throw error
  return Object.fromEntries(data.map((p) => [p.id, p.name]))
}

/** Aufgabe erledigt setzen (mit Zeit und Person fürs Protokoll). */
export async function erledigeAufgabe(id: string, ichId: string | null): Promise<void> {
  const { error } = await db()
    .from('aufgaben')
    .update({ erledigt_am: new Date().toISOString(), erledigt_von: ichId })
    .eq('id', id)
  if (error) throw error
}

/** Neue Aufgabe am Kunden, für mich oder jemand anderen. */
export async function legeKundenaufgabeAn(
  kontaktId: string,
  e: { titel: string; faellig_am: string | null; person_id: string | null },
): Promise<void> {
  const { error } = await db()
    .from('aufgaben')
    .insert({ ...e, bezug_tabelle: 'kontakte', bezug_id: kontaktId })
  if (error) throw error
}
