import type { Database } from '@/types/datenbank'
import type { Kontaktzeile } from '@/types/kontakt'
import { supabase } from './supabase'

type Zeile = Database['public']['Views']['kunden_uebersicht']['Row']

/** Gemeinsamer Zugriff auf Kontakte für Kunden, Adressbuch und Befehlspalette. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Wandelt eine Zeile der Ansicht in die App-Form. Die Ansicht liefert alle Spalten als «vielleicht leer». */
export function kontaktAusZeile(z: Zeile): Kontaktzeile {
  return {
    id: z.id ?? '',
    kundennummer: z.kundennummer ?? 0,
    art: z.art === 'firma' ? 'firma' : 'person',
    kontaktart: z.kontaktart ?? 'privat',
    anrede: z.anrede,
    vorname: z.vorname,
    nachname: z.nachname,
    firma: z.firma,
    name: z.name ?? '–',
    email: z.email,
    telefon: z.telefon,
    sprache: z.sprache === 'fr' ? 'fr' : 'de',
    werbesperre: z.werbesperre ?? false,
    notiz: z.notiz,
    objektId: z.objekt_id,
    strasse: z.strasse,
    plz: z.plz,
    ort: z.ort,
    anzahlObjekte: z.anzahl_objekte ?? 0,
    stand: z.stand,
    standDatum: z.stand_datum,
    standGruppe: z.stand_gruppe,
    standRang: z.stand_rang,
    standTabelle: z.stand_tabelle,
    standBezug: z.stand_bezug,
    letzterKontakt: z.letzter_kontakt,
    anzahlOfferten: z.anzahl_offerten ?? 0,
    anzahlProjekte: z.anzahl_projekte ?? 0,
    moeglicheDublette: z.moegliche_dublette ?? false,
    geloeschtAm: z.geloescht_am,
    erstelltAm: z.erstellt_am ?? '',
    suchtext: z.suchtext ?? '',
    telefonZiffern: z.telefon_ziffern ?? '',
  }
}

/**
 * Alle Kontakte (ohne Papierkorb) für die Listen. Gefiltert und sortiert wird in der App,
 * weil das bei einigen tausend Kontakten sofort reagiert und offline weiter geht.
 */
export async function ladeKontakte({ papierkorb = false }: { papierkorb?: boolean } = {}): Promise<Kontaktzeile[]> {
  let abfrage = db().from('kunden_uebersicht').select('*').order('name')
  abfrage = papierkorb ? abfrage.not('geloescht_am', 'is', null) : abfrage.is('geloescht_am', null)
  const { data, error } = await abfrage
  if (error) throw error
  return data.map(kontaktAusZeile)
}

/** Ein einzelner Kontakt (auch aus dem Papierkorb), z. B. für den Kopf der Kundenakte. */
export async function ladeKontakt(id: string): Promise<Kontaktzeile | null> {
  const { data, error } = await db().from('kunden_uebersicht').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? kontaktAusZeile(data) : null
}

/**
 * Schnellsuche für die Befehlspalette: höchstens 8 Treffer. Ziffern suchen auch in Telefonnummern.
 * Die Eingabe wird für PostgREST entschärft, damit Zeichen wie Komma oder Klammer nichts auslösen.
 */
export async function sucheKontakte(suche: string): Promise<Kontaktzeile[]> {
  const q = suche
    .trim()
    .toLowerCase()
    .replace(/[%,()*\\]/g, ' ')
  if (q.length < 2) return []
  const woerter = q.split(/\s+/).filter(Boolean).slice(0, 4)
  let abfrage = db().from('kunden_uebersicht').select('*').is('geloescht_am', null).limit(8)
  const ziffern = q.replace(/\D/g, '')
  if (/^[\d\s+/-]+$/.test(q) && ziffern.length >= 4) {
    abfrage = abfrage.or(`telefon_ziffern.ilike.%${ziffern.replace(/^(0041|41|0)/, '')}%,suchtext.ilike.%${ziffern}%`)
  } else {
    // Wie in der Liste: reine Ziffern dürfen auch Teil der Telefonnummer sein («Bulle 079»).
    for (const w of woerter) {
      abfrage = /^\d{3,}$/.test(w)
        ? abfrage.or(`suchtext.ilike.%${w}%,telefon_ziffern.ilike.%${w.replace(/^0/, '')}%`)
        : abfrage.ilike('suchtext', `%${w}%`)
    }
  }
  const { data, error } = await abfrage.order('name')
  if (error) throw error
  return data.map(kontaktAusZeile)
}
