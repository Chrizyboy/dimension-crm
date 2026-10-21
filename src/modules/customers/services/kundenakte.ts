import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { AktivitaetEingabe, KontaktEingabe, ObjektEingabe } from '../schema'
import type { Dublette, Kundenakte, Zeitachseneintrag } from '../types'

/** Wirft verständlich, wenn keine Datenbank verbunden ist (Vorschau). */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const DOKUMENT_SPALTEN =
  'id, name, mime_typ, bytes, ordner, speicher, speicher_pfad, sharepoint_url, bezug_tabelle, bezug_id, hochgeladen_am, erstellt_am'

/**
 * Lädt alles, was an einem Kontakt hängt, parallel. Dokumente hängen in V233 am Lead oder an der
 * Offerte; darum werden sie über alle Geschäfte des Kontakts gesucht, nicht nur am Kontakt.
 */
export async function ladeKundenakte(id: string): Promise<Kundenakte | null> {
  const c = db()
  const [kontakt, objekte, verkaufschancen, offerten, projekte, werkvertraege] = await Promise.all([
    c.from('kontakte').select('*').eq('id', id).maybeSingle(),
    c.from('objekte').select('*').eq('kontakt_id', id).is('geloescht_am', null).order('erstellt_am'),
    c
      .from('verkaufschancen')
      .select('*')
      .eq('kontakt_id', id)
      .is('geloescht_am', null)
      .order('eingang_am', { ascending: false }),
    c
      .from('offerten')
      .select('*')
      .eq('kontakt_id', id)
      .is('geloescht_am', null)
      .order('angebot_am', { ascending: false }),
    c
      .from('projekte')
      .select('*')
      .eq('kontakt_id', id)
      .is('geloescht_am', null)
      .order('erstellt_am', { ascending: false }),
    c
      .from('werkvertraege')
      .select('*')
      .eq('kontakt_id', id)
      .is('geloescht_am', null)
      .order('erstellt_am', { ascending: false }),
  ])
  for (const r of [kontakt, objekte, verkaufschancen, offerten, projekte, werkvertraege]) if (r.error) throw r.error
  if (!kontakt.data) return null
  const bezuege = [
    id,
    ...(verkaufschancen.data ?? []).map((x) => x.id),
    ...(offerten.data ?? []).map((x) => x.id),
    ...(projekte.data ?? []).map((x) => x.id),
    ...(werkvertraege.data ?? []).map((x) => x.id),
  ]
  const dokumente = await c
    .from('dokumente')
    .select(DOKUMENT_SPALTEN)
    .in('bezug_id', bezuege)
    .is('geloescht_am', null)
    .order('hochgeladen_am', { ascending: false, nullsFirst: false })
  if (dokumente.error) throw dokumente.error
  return {
    kontakt: kontakt.data,
    objekte: objekte.data ?? [],
    verkaufschancen: verkaufschancen.data ?? [],
    offerten: offerten.data ?? [],
    projekte: projekte.data ?? [],
    werkvertraege: werkvertraege.data ?? [],
    dokumente: dokumente.data,
  }
}

/** Die Zeitachse eines Kontakts, neuestes zuerst (höchstens 500 Einträge). */
export async function ladeZeitachse(id: string): Promise<Zeitachseneintrag[]> {
  const { data, error } = await db().rpc('kunden_zeitachse', { p_kontakt: id })
  if (error) throw error
  return data.map((z) => ({
    zeitpunkt: z.zeitpunkt,
    art: z.art,
    text: z.text,
    daten: z.daten && typeof z.daten === 'object' && !Array.isArray(z.daten) ? z.daten : {},
    bezugTabelle: z.bezug_tabelle,
    bezugId: z.bezug_id,
    wer: z.wer,
  }))
}

/** Leere Texte als `null` speichern, damit «leer» in der Datenbank eindeutig ist. */
const oderNull = (w: string) => (w.trim() === '' ? null : w.trim())

function kontaktFelder(e: KontaktEingabe) {
  return {
    art: e.art,
    kontaktart: e.kontaktart,
    anrede: oderNull(e.anrede),
    vorname: oderNull(e.vorname),
    nachname: oderNull(e.nachname),
    firma: oderNull(e.firma),
    email: oderNull(e.email),
    telefon: oderNull(e.telefon),
    sprache: e.sprache,
    werbesperre: e.werbesperre,
    notiz: oderNull(e.notiz),
  }
}

/** Mögliche Dubletten zu den Eingaben (gleiche Mail, Telefon oder Name). */
export async function pruefeDubletten(e: KontaktEingabe, ohne?: string): Promise<Dublette[]> {
  const name = e.art === 'firma' ? e.firma : `${e.vorname} ${e.nachname}`.trim()
  const { data, error } = await db().rpc('moegliche_dubletten', {
    p_name: name,
    p_email: e.email,
    p_telefon: e.telefon,
    ...(ohne ? { p_ohne: ohne } : {}),
  })
  if (error) throw error
  return data.map((d) => ({ ...d, grund: d.grund === 'email' || d.grund === 'telefon' ? d.grund : 'name' }))
}

/** Legt einen Kontakt an; mit Adresse entsteht gleich das erste Gebäude. Liefert die neue ID. */
export async function legeKontaktAn(e: KontaktEingabe): Promise<string> {
  const { data, error } = await db().from('kontakte').insert(kontaktFelder(e)).select('id').single()
  if (error) throw error
  if (e.ort || e.strasse || e.plz) {
    const objekt = await db()
      .from('objekte')
      .insert({ kontakt_id: data.id, strasse: oderNull(e.strasse), plz: oderNull(e.plz), ort: oderNull(e.ort) })
    if (objekt.error) throw objekt.error
  }
  return data.id
}

/** Ändert die Stammdaten eines Kontakts (die Adresse gehört zum Gebäude, siehe `speichereObjekt`). */
export async function aendereKontakt(id: string, e: KontaktEingabe): Promise<void> {
  const { error } = await db().from('kontakte').update(kontaktFelder(e)).eq('id', id)
  if (error) throw error
}

/** Neues Gebäude (ohne `id`) oder Änderung eines bestehenden. */
export async function speichereObjekt(kontaktId: string, id: string | null, e: ObjektEingabe): Promise<void> {
  const felder = {
    strasse: oderNull(e.strasse),
    plz: oderNull(e.plz),
    ort: oderNull(e.ort),
    gebaeudeart: e.gebaeudeart,
    dachform: e.dachform,
    eigentum: e.eigentum,
    verbrauch_kwh: e.verbrauch_kwh,
    netzbetreiber: oderNull(e.netzbetreiber),
    gemeinde: oderNull(e.gemeinde),
  }
  const { error } = id
    ? await db().from('objekte').update(felder).eq('id', id)
    : await db()
        .from('objekte')
        .insert({ ...felder, kontakt_id: kontaktId })
  if (error) throw error
}

/** Hält einen Kontakt fest (Anruf, Mail, Notiz …). `personId` ist die angemeldete Person. */
export async function erfasseAktivitaet(
  kontaktId: string,
  personId: string | null,
  e: AktivitaetEingabe,
): Promise<void> {
  const { error } = await db().from('aktivitaeten').insert({
    kontakt_id: kontaktId,
    person_id: personId,
    art: e.art,
    richtung: e.richtung,
    text: e.text,
    ergebnis: e.ergebnis,
  })
  if (error) throw error
}

/** Papierkorb statt Löschen (CLAUDE.md Regel 5). Wiederherstellen setzt das Datum zurück. */
export async function setzePapierkorb(id: string, inPapierkorb: boolean): Promise<void> {
  const { error } = await db()
    .from('kontakte')
    .update({ geloescht_am: inPapierkorb ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

/** Alle Daten zur Person als JSON (Auskunft nach revDSG). */
export async function exportiereKontakt(id: string): Promise<Json> {
  const { data, error } = await db().rpc('kontakt_export', { p_kontakt: id })
  if (error) throw error
  return data
}

/** Adresse zum Öffnen eines Dokuments (gemeinsam mit der Lead-Akte, siehe `src/services/dokumente.ts`). */
export { dokumentAdresse } from '@/services/dokumente'
