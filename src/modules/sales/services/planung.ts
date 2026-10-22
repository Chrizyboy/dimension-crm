import { supabase } from '@/services/supabase'
import type { Json } from '@/types/datenbank'
import type { Kalendertermin } from '../lib/kalenderdatei'
import { STANDARD_TOUR, type TourEinstellungen } from '../lib/route'
import type { VerkaufFilter } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

/** Ein Termin aus dem Kalender einer Person, mit Lage (aus der PLZ im Ort). */
export interface Kalendereintrag extends Kalendertermin {
  id: string
  personId: string
  breite: number | null
  laenge: number | null
}

/** Kalendereinträge der Personen im Zeitraum, mit Lage aus dem PLZ-Verzeichnis. */
export async function ladeKalender(von: string, bis: string): Promise<Kalendereintrag[]> {
  const { data, error } = await db()
    .from('kalender_eintraege')
    .select('id, person_id, beginn, ende, ganztags, betreff, ort, plz, anzeige_als, extern_id')
    .is('geloescht_am', null)
    .lt('beginn', bis)
    .gt('ende', von)
    .order('beginn')
  if (error) throw error
  const lagen = await ladeLagen(data.map((e) => e.plz).filter((p): p is string => !!p))
  return data.map((e) => {
    const lage = e.plz ? lagen.get(e.plz) : undefined
    return {
      id: e.id,
      personId: e.person_id,
      beginn: e.beginn,
      ende: e.ende,
      ganztags: e.ganztags,
      betreff: e.betreff ?? '',
      ort: e.ort ?? '',
      plz: e.plz,
      anzeige_als: e.anzeige_als as Kalendertermin['anzeige_als'],
      extern_id: e.extern_id ?? '',
      breite: lage?.breite ?? null,
      laenge: lage?.laenge ?? null,
    }
  })
}

/** Ersetzt die Termine einer Person aus einer Datei; alte kommen in den Papierkorb. */
export async function ersetzeKalender(
  personId: string,
  quelle: 'datei' | 'einfuegen',
  termine: readonly Kalendertermin[],
): Promise<number> {
  const { data, error } = await db().rpc('kalender_ersetzen', {
    p_person: personId,
    p_quelle: quelle,
    p_eintraege: termine as unknown as Json,
  })
  if (error) throw error
  return data
}

/** Lage und Höhe zu PLZ (für Standorte, Heimadressen und Kalendertermine). */
export async function ladeLagen(plz: readonly string[]) {
  const liste = [...new Set(plz)]
  const karte = new Map<string, { breite: number; laenge: number; hoehe: number | null; ort: string }>()
  if (!liste.length) return karte
  const { data, error } = await db().from('plz_verzeichnis').select('plz, ort, breite, laenge, hoehe').in('plz', liste)
  if (error) throw error
  for (const z of data) if (!karte.has(z.plz)) karte.set(z.plz, z)
  return karte
}

/** Einstellungen der Tourplanung (Tempo, Umwegfaktor, Elektroauto); fehlt etwas, gilt der Standard. */
export async function ladeTourEinstellungen(): Promise<TourEinstellungen> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'tourplanung').maybeSingle()
  if (error) throw error
  const wert = (data?.wert ?? {}) as Partial<TourEinstellungen>
  return { ...STANDARD_TOUR, ...wert, auto: { ...STANDARD_TOUR.auto, ...(wert.auto ?? {}) } }
}

/** Vorlage der SMS am Vortag (V172). */
export interface SmsVorlage {
  aktiv: boolean
  /** Ab Phase 8: der Zeitplan sendet ab `uhrzeit` ohne Freigabe (nur wenn ausdrücklich eingeschaltet). */
  automatisch?: boolean
  uhrzeit: string
  absender: string
  text_de: string
  text_fr: string
}

/** Lädt die SMS-Vorlage aus den Einstellungen. */
export async function ladeSmsVorlage(): Promise<SmsVorlage | null> {
  const { data, error } = await db()
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'sms_erinnerung')
    .maybeSingle()
  if (error) throw error
  return (data?.wert as SmsVorlage | undefined) ?? null
}

/** Eine gespeicherte Ansicht der Liste (Filter und Darstellung). */
export interface GespeicherteAnsicht {
  id: string
  name: string
  geteilt: boolean
  eigene: boolean
  einstellungen: { filter: VerkaufFilter; art: 'abschnitte' | 'tabelle' }
}

/** Gespeicherte Ansichten eines Bereichs: eigene und die fürs Team geteilten. */
export async function ladeAnsichten(bereich: string, meinePersonId: string | null): Promise<GespeicherteAnsicht[]> {
  const { data, error } = await db()
    .from('gespeicherte_ansichten')
    .select('id, name, geteilt, person_id, einstellungen')
    .eq('bereich', bereich)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data.map((a) => ({
    id: a.id,
    name: a.name,
    geteilt: a.geteilt,
    eigene: a.person_id === meinePersonId,
    einstellungen: a.einstellungen as unknown as GespeicherteAnsicht['einstellungen'],
  }))
}

/** Speichert die aktuelle Ansicht unter einem Namen. */
export async function speichereAnsicht(
  bereich: string,
  name: string,
  geteilt: boolean,
  einstellungen: GespeicherteAnsicht['einstellungen'],
): Promise<void> {
  const { error } = await db()
    .from('gespeicherte_ansichten')
    .insert({ bereich, name, geteilt, einstellungen: einstellungen as unknown as NonNullable<Json> })
  if (error) throw error
}

/** Legt eine Ansicht in den Papierkorb (nichts wird hart gelöscht). */
export async function entferneAnsicht(id: string): Promise<void> {
  const { error } = await db()
    .from('gespeicherte_ansichten')
    .update({ geloescht_am: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
