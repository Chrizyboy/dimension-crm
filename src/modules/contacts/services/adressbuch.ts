import { supabase } from '@/services/supabase'
import type { Database } from '@/types/datenbank'
import type { PartnerAkte, PartnerKopf, Partnerzeile } from '../types'

/** Datenzugriff des Adressbuchs (Geschäftspartner, Entscheid 0049). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

type Zeile = Database['public']['Views']['adressbuch_uebersicht']['Row']

/** Zeile der Sicht in die App-Form (die Sicht liefert alles als «vielleicht leer»). */
export function partnerAusZeile(z: Zeile): Partnerzeile {
  return {
    id: z.id ?? '',
    kundennummer: z.kundennummer,
    art: z.art === 'person' ? 'person' : 'firma',
    name: z.name ?? '–',
    email: z.email,
    telefon: z.telefon,
    sprache: z.sprache === 'fr' ? 'fr' : 'de',
    geloeschtAm: z.geloescht_am,
    rollen: z.rollen ?? [],
    strasse: z.strasse,
    plz: z.plz,
    ort: z.ort,
    webseite: z.webseite,
    uidNr: z.uid_nr,
    hauptkontakt: z.hauptkontakt,
    hauptkontaktTelefon: z.hauptkontakt_telefon,
    hauptkontaktEmail: z.hauptkontakt_email,
    anzahlPersonen: z.anzahl_personen ?? 0,
    zuletzt: z.zuletzt,
    nachweisBis: z.nachweis_bis,
    gesucheOffen: z.gesuche_offen ?? 0,
    gesucheAlt: z.gesuche_alt ?? 0,
    gesucheTage: z.gesuche_tage,
    gemeinden: z.gemeinden ?? 0,
    auftraegeLaufend: z.auftraege_laufend ?? 0,
    auftraege: z.auftraege ?? 0,
    bewertung: z.bewertung,
    provisionProzent: z.provision_prozent,
    kundennummerBei: z.kundennummer_bei,
    gewerk: z.gewerk,
    suchtext: z.suchtext ?? '',
    telefonZiffern: z.telefon_ziffern ?? '',
  }
}

/** Alle Geschäftspartner (oder die im Papierkorb). */
export async function ladePartner(papierkorb = false): Promise<Partnerzeile[]> {
  const q = db().from('adressbuch_uebersicht').select('*')
  const { data, error } = await (papierkorb ? q.not('geloescht_am', 'is', null) : q.is('geloescht_am', null))
    .order('name')
    .limit(5000)
  if (error) throw error
  return data.map(partnerAusZeile)
}

/** Kopf eines Partners: Kontakt und Postadresse. */
export async function ladeKopf(id: string): Promise<PartnerKopf | null> {
  const { data, error } = await db()
    .from('kontakte')
    .select(
      'id, kundennummer, art, firma, vorname, nachname, email, telefon, sprache, notiz, uid_nr, geloescht_am, ' +
        'angaben:partner_angaben(id, strasse, plz, ort, land, webseite, rechtsform, geloescht_am)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const k = data as unknown as {
    id: string
    kundennummer: number | null
    art: string
    firma: string | null
    vorname: string | null
    nachname: string | null
    email: string | null
    telefon: string | null
    sprache: string
    notiz: string | null
    uid_nr: string | null
    geloescht_am: string | null
    angaben: {
      id: string
      strasse: string | null
      plz: string | null
      ort: string | null
      land: string
      webseite: string | null
      rechtsform: string | null
      geloescht_am: string | null
    }[]
  }
  // Eine Zeile je Partner (eindeutig): PostgREST liefert dann ein Objekt statt einer Liste.
  const roh = k.angaben as (typeof k.angaben)[number] | typeof k.angaben | null
  const a = (Array.isArray(roh) ? roh : roh ? [roh] : []).find((x) => !x.geloescht_am)
  return {
    id: k.id,
    kundennummer: k.kundennummer,
    art: k.art === 'person' ? 'person' : 'firma',
    name: k.firma?.trim() || [k.vorname, k.nachname].filter(Boolean).join(' ') || '–',
    firma: k.firma,
    vorname: k.vorname,
    nachname: k.nachname,
    email: k.email,
    telefon: k.telefon,
    sprache: k.sprache === 'fr' ? 'fr' : 'de',
    notiz: k.notiz,
    geloeschtAm: k.geloescht_am,
    angabenId: a?.id ?? null,
    strasse: a?.strasse ?? null,
    plz: a?.plz ?? null,
    ort: a?.ort ?? null,
    land: a?.land ?? 'CH',
    webseite: a?.webseite ?? null,
    uidNr: k.uid_nr,
    rechtsform: a?.rechtsform ?? null,
  }
}

/** Akte in einer Abfrage (mit den Rechten der Person: Bestellungen nur, wer sie sehen darf). */
export async function ladeAkte(id: string): Promise<PartnerAkte> {
  const { data, error } = await db().rpc('partner_akte', { p_kontakt: id })
  if (error) throw error
  const a = (data ?? {}) as Record<string, unknown>
  const liste = <T>(k: string) => (Array.isArray(a[k]) ? (a[k] as T[]) : [])
  const jahr = (a.einkauf_jahr ?? {}) as { total_rappen?: number; anzahl?: number }
  return {
    rollen: liste('rollen'),
    nachweise: liste('nachweise'),
    gesuche: liste('gesuche'),
    gemeinden: liste<string>('gemeinden').sort((x, y) => x.localeCompare(y, 'de-CH')),
    projekte: typeof a.projekte === 'number' ? a.projekte : 0,
    bestellungen: liste('bestellungen'),
    einkaufJahr: { total_rappen: jahr.total_rappen ?? 0, anzahl: jahr.anzahl ?? 0 },
    auftraege: liste('auftraege'),
    empfehlungen: liste('empfehlungen'),
    dokumente: liste('dokumente'),
  }
}

/** Stammdaten ändern: Kontakt (Name, Mail, Telefon, Sprache, Notiz) und Postadresse/UID. */
export async function speichereStammdaten(k: PartnerKopf): Promise<void> {
  const { error } = await db()
    .from('kontakte')
    .update({
      firma: k.art === 'firma' ? k.firma?.trim() || null : null,
      vorname: k.art === 'person' ? k.vorname?.trim() || null : null,
      nachname: k.art === 'person' ? k.nachname?.trim() || null : null,
      email: k.email?.trim() || null,
      telefon: k.telefon?.trim() || null,
      sprache: k.sprache,
      notiz: k.notiz?.trim() || null,
      uid_nr: k.uidNr?.trim() || null,
    })
    .eq('id', k.id)
  if (error) throw error
  await speichereAngaben(k)
}

/** Postadresse, Webseite und Rechtsform (eine Zeile je Partner, angelegt beim ersten Speichern). */
export async function speichereAngaben(k: PartnerKopf): Promise<void> {
  const zeile = {
    strasse: k.strasse?.trim() || null,
    plz: k.plz?.trim() || null,
    ort: k.ort?.trim() || null,
    land: k.land.trim() || 'CH',
    webseite: k.webseite?.trim() || null,
    rechtsform: k.rechtsform?.trim() || null,
  }
  const { error } = k.angabenId
    ? await db().from('partner_angaben').update(zeile).eq('id', k.angabenId)
    : await db()
        .from('partner_angaben')
        .insert({ ...zeile, kontakt_id: k.id })
  if (error) throw error
}

/** Kontakt erfassen (Anruf, Mail, Notiz) für den Verlauf. */
export async function erfasseKontakt(kontaktId: string, personId: string | null, art: string, text: string) {
  const { error } = await db()
    .from('aktivitaeten')
    .insert({ kontakt_id: kontaktId, person_id: personId, art, text: text.trim() || null })
  if (error) throw error
}

/** Verlauf: Kontakte mit diesem Partner, neueste zuerst. */
export async function ladeVerlauf(kontaktId: string) {
  const { data, error } = await db()
    .from('aktivitaeten')
    .select('id, art, richtung, zeitpunkt, text, person:personen(name)')
    .eq('kontakt_id', kontaktId)
    .is('geloescht_am', null)
    .order('zeitpunkt', { ascending: false })
    .limit(100)
  if (error) throw error
  return data as unknown as {
    id: string
    art: string
    richtung: string | null
    zeitpunkt: string
    text: string | null
    person: { name: string } | null
  }[]
}

/** Partner in den Papierkorb legen oder wiederherstellen. */
export async function verschiebePartner(id: string, inPapierkorb: boolean): Promise<void> {
  const { error } = await db()
    .from('kontakte')
    .update({ geloescht_am: inPapierkorb ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

/** Fristen des Adressbuchs aus `einstellungen.adressbuch` (Vorlauf für Nachweise, Warnung bei Gesuchen). */
export async function ladeEinstellungen(): Promise<{ nachweisVorlauf: number; gesuchWarnung: number }> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'adressbuch').maybeSingle()
  if (error) throw error
  const w = (data?.wert ?? {}) as { nachweis_vorlauf_tage?: number; gesuch_warnung_tage?: number }
  return { nachweisVorlauf: w.nachweis_vorlauf_tage ?? 30, gesuchWarnung: w.gesuch_warnung_tage ?? 15 }
}
