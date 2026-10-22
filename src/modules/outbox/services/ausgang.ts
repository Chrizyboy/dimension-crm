import { supabase } from '@/services/supabase'
import type { AusgangAenderung } from '../schema'
import type { AusgangEintrag, AusgangFilter } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER =
  'id, kanal, art, an, cc, betreff, text, html, status, automatisch, fehler, verworfen_grund, anhaenge, erstellt_am, freigegeben_am, gesendet_am, kontakt_id, verkaufschance_id, absender:personen!ausgangskorb_absender_person_id_fkey(name), freigeber:personen!ausgangskorb_freigegeben_von_fkey(name), kontakt:kontakte(art, vorname, nachname, firma)'

interface Roh extends Omit<AusgangEintrag, 'absender' | 'freigegeben_durch' | 'kunde'> {
  absender: { name: string } | null
  freigeber: { name: string } | null
  kontakt: { art: string; vorname: string | null; nachname: string | null; firma: string | null } | null
}

/** Name des Kunden wie überall im CRM: Firma bei Firmen, sonst Vor- und Nachname. */
function kundenname(k: Roh['kontakt']): string | null {
  if (!k) return null
  const person = [k.vorname, k.nachname].filter(Boolean).join(' ')
  return (k.art === 'firma' ? k.firma : person) || k.firma || person || null
}

/** Einträge des Ausgangskorbs (neueste zuerst, höchstens 300). */
export async function ladeAusgang(filter: AusgangFilter): Promise<AusgangEintrag[]> {
  let q = db().from('ausgangskorb').select(FELDER).is('geloescht_am', null)
  if (filter === 'offen') q = q.in('status', ['wartet', 'freigegeben', 'wird_gesendet', 'fehler'])
  if (filter === 'gesendet') q = q.eq('status', 'gesendet')
  if (filter === 'verworfen') q = q.eq('status', 'verworfen')
  const { data, error } = await q.order('erstellt_am', { ascending: false }).limit(300)
  if (error) throw error
  return (data as unknown as Roh[]).map(({ absender, freigeber, kontakt, ...r }) => ({
    ...r,
    anhaenge: Array.isArray(r.anhaenge) ? r.anhaenge : [],
    absender: absender?.name ?? null,
    freigegeben_durch: freigeber?.name ?? null,
    kunde: kundenname(kontakt),
  }))
}

/** Freigeben: ein Mensch hat den Text gesehen und sagt «senden» (Regel 6). Gibt die Zahl zurück. */
export async function freigeben(ids: string[]): Promise<number> {
  const { data, error } = await db().rpc('ausgang_freigeben', { p_ids: ids })
  if (error) throw error
  return data
}

/** Nicht senden (mit Grund). */
export async function verwerfen(id: string, grund: string): Promise<void> {
  const { error } = await db().rpc('ausgang_verwerfen', { p_id: id, p_grund: grund })
  if (error) throw error
}

/** Empfänger oder Text vor der Freigabe ändern. */
export async function aendern(id: string, w: AusgangAenderung): Promise<void> {
  const { error } = await db().rpc('ausgang_aendern', {
    p_id: id,
    p: { an: w.an, cc: w.cc, betreff: w.betreff, text: w.text },
  })
  if (error) throw error
}
