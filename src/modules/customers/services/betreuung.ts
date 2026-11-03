import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { Dublette } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Abweichende Rechnungsadresse; leer = Adresse des Kunden. */
export interface Rechnungsadresse {
  name: string
  zusatz: string
  strasse: string
  plz: string
  ort: string
}

/** Betreuung und Rechnungsangaben am Kunden (Entscheid 0045). */
export interface Betreuung {
  betreuer_id: string | null
  herkunft: string | null
  uid_nr: string
  rechnungs_email: string
  zahlungsfrist_tage: number | null
  rechnungsadresse: Rechnungsadresse | null
}

const LEER: Rechnungsadresse = { name: '', zusatz: '', strasse: '', plz: '', ort: '' }

/** Liest die Rechnungsadresse aus dem JSON der Datenbank; fehlende Teile werden leer. */
export function rechnungsadresseAus(json: Json | null): Rechnungsadresse | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null
  const t = (k: keyof Rechnungsadresse) => (typeof json[k] === 'string' ? json[k] : '')
  const a = { name: t('name'), zusatz: t('zusatz'), strasse: t('strasse'), plz: t('plz'), ort: t('ort') }
  return Object.values(a).some((w) => w.trim()) ? a : null
}

/** Rechnungsadresse in einer Zeile, für die Anzeige. */
export function rechnungsadresseEinzeilig(a: Rechnungsadresse | null): string {
  if (!a) return ''
  return [a.name, a.zusatz, a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter((x) => x.trim()).join(', ')
}

/** Aktive Personen für «Betreuer», mit Kurzzeichen. */
export async function ladeBetreuerAuswahl(): Promise<{ id: string; name: string; kurzzeichen: string | null }[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, name, kurzzeichen')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}

/** Speichert Betreuer, Herkunft und Rechnungsangaben. Leere Texte werden zu `null`. */
export async function speichereBetreuung(kontaktId: string, b: Betreuung): Promise<void> {
  const leer = (s: string) => (s.trim() === '' ? null : s.trim())
  const adresse = b.rechnungsadresse && rechnungsadresseAus({ ...LEER, ...b.rechnungsadresse })
  const { error } = await db()
    .from('kontakte')
    .update({
      betreuer_id: b.betreuer_id,
      herkunft: b.herkunft,
      uid_nr: leer(b.uid_nr),
      rechnungs_email: leer(b.rechnungs_email),
      zahlungsfrist_tage: b.zahlungsfrist_tage,
      rechnungsadresse: adresse ? { ...adresse } : null,
    })
    .eq('id', kontaktId)
  if (error) throw error
}

/** Mögliche Doppelte zu einem Kontakt (gleiche Mail, Telefon oder Name), ohne ihn selbst. */
export async function ladeDoppelte(
  kontaktId: string,
  k: { name: string; email: string | null; telefon: string | null },
): Promise<Dublette[]> {
  const { data, error } = await db().rpc('moegliche_dubletten', {
    p_name: k.name,
    p_email: k.email ?? '',
    p_telefon: k.telefon ?? '',
    p_ohne: kontaktId,
  })
  if (error) throw error
  return data as Dublette[]
}

/**
 * Führt den Doppelten `weg` in `behalten` über (nur Administration). Alles hängt danach am Behaltenen,
 * der Doppelte liegt im Papierkorb. Gibt die Zahl der umgehängten Einträge zurück.
 */
export async function fuehreZusammen(behalten: string, weg: string): Promise<number> {
  const { data, error } = await db().rpc('kontakt_zusammenfuehren', { p_behalten: behalten, p_weg: weg })
  if (error) throw error
  return data
}
