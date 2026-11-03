import { rufeFunktion } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import type { NeuerPartnerEingabe, PartnerDublette, PartnerKopf, UidFirma } from '../types'
import { speichereAngaben } from './adressbuch'
import { speichereRolle } from './partnerTeile'

/** Neuer Partner und Ansprechpersonen anlegen (Entscheid 0049). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Mögliche Doppelte (UID, Mail, Telefon, Name ohne Rechtsform). */
export async function suchePartnerDubletten(e: {
  name: string
  email?: string
  telefon?: string
  uid?: string
}): Promise<PartnerDublette[]> {
  if (e.name.trim().length < 3 && !e.email && !e.uid) return []
  const { data, error } = await db().rpc('partner_dubletten', {
    p_name: e.name,
    ...(e.email ? { p_email: e.email } : {}),
    ...(e.telefon ? { p_telefon: e.telefon } : {}),
    ...(e.uid ? { p_uid: e.uid } : {}),
  })
  if (error) throw error
  return data as PartnerDublette[]
}

/** Firmen im UID-Register des Bundes (über die Edge Function, ohne Schlüssel). */
export async function sucheImUidRegister(name: string): Promise<UidFirma[]> {
  const r = await rufeFunktion<{ firmen: UidFirma[] }>('adressbuch', 'uid_suche', { name })
  return r.firmen
}

/**
 * Neuer Partner: Kontakt, Postadresse, Rollen mit Angaben und auf Wunsch die erste Ansprechperson.
 * Gibt die ID zurück. Schlägt ein späterer Schritt fehl, bleibt der Kontakt und lässt sich in der Akte ergänzen.
 */
export async function legePartnerAn(e: NeuerPartnerEingabe): Promise<string> {
  const firma = e.art === 'firma'
  const { data, error } = await db()
    .from('kontakte')
    .insert({
      art: e.art,
      kontaktart: 'partner',
      firma: firma ? e.name.trim() : null,
      vorname: firma ? null : e.vorname?.trim() || null,
      nachname: firma ? null : e.name.trim(),
      email: e.email.trim() || null,
      telefon: e.telefon.trim() || null,
      sprache: e.sprache,
    })
    .select('id')
    .single()
  if (error) throw error
  const id = data.id
  await speichereAngaben({
    id,
    angabenId: null,
    strasse: e.strasse,
    plz: e.plz,
    ort: e.ort,
    land: 'CH',
    webseite: e.webseite,
    uidNr: e.uidNr,
    rechtsform: e.rechtsform,
  } as PartnerKopf)
  for (const r of e.rollen) await speichereRolle(id, r, e.angaben[r] ?? {})
  if (firma && e.person && (e.person.vorname.trim() || e.person.nachname.trim())) {
    await legePersonAn(id, { ...e.person, sprache: e.sprache, hauptkontakt: true })
  }
  return id
}

/** Neue Ansprechperson: eigener Kontakt (Art «Partner») und Zugehörigkeit zur Firma. */
export async function legePersonAn(
  firmaId: string,
  p: {
    vorname: string
    nachname: string
    funktion: string
    telefon: string
    email: string
    sprache: 'de' | 'fr'
    hauptkontakt?: boolean
    unterschreibt?: boolean
    rechnungen?: boolean
    vorOrt?: boolean
    bevorzugt?: string
  },
): Promise<string> {
  const { data, error } = await db()
    .from('kontakte')
    .insert({
      art: 'person',
      kontaktart: 'partner',
      vorname: p.vorname.trim() || null,
      nachname: p.nachname.trim() || null,
      telefon: p.telefon.trim() || null,
      email: p.email.trim() || null,
      sprache: p.sprache,
    })
    .select('id')
    .single()
  if (error) throw error
  const z = await db()
    .from('kontakt_zugehoerigkeiten')
    .insert({
      person_id: data.id,
      firma_id: firmaId,
      funktion: p.funktion.trim() || null,
      hauptkontakt: p.hauptkontakt ?? false,
      unterschreibt: p.unterschreibt ?? false,
      rechnungen: p.rechnungen ?? false,
      vor_ort: p.vorOrt ?? false,
      bevorzugt: p.bevorzugt?.trim() || null,
    })
  if (z.error) throw z.error
  return data.id
}

/** Personen zum Verknüpfen (bestehende Kontakte, Suche nach Name). */
export async function suchePersonen(suche: string) {
  const s = suche.trim().replace(/[%,()]/g, ' ')
  if (s.length < 2) return []
  const { data, error } = await db()
    .from('kontakte')
    .select('id, vorname, nachname, telefon, email')
    .eq('art', 'person')
    .is('geloescht_am', null)
    .or(`vorname.ilike.%${s}%,nachname.ilike.%${s}%,email.ilike.%${s}%`)
    .limit(8)
  if (error) throw error
  return data.map((k) => ({
    id: k.id,
    name: [k.vorname, k.nachname].filter(Boolean).join(' '),
    telefon: k.telefon,
    email: k.email,
  }))
}
