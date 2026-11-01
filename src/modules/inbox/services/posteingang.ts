import { microsoft } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import type { Art, Auswertung, Mail, Person, PosteingangRegeln } from '../types'

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER = `id, eingang_am, von_email, von_name, betreff, vorschau, web_link, hat_anhang, postfach, postfach_person_id,
  art, sprache, dringend, zusammenfassung, sortiert, stand, frist_am, eskalation_am, erledigt_am, erledigt_grund,
  reaktion_minuten, zustaendig_id,
  zustaendig:personen!posteingang_zustaendig_id_fkey(name),
  vertreten:personen!posteingang_vertretung_fuer_fkey(name),
  erledigt:personen!posteingang_erledigt_von_fkey(name),
  kontakt:kontakte(id, vorname, nachname, firma, sprache),
  lead:verkaufschancen(id, nummer), offerte:offerten(id, nummer), projekt:projekte(id, nummer),
  rechnung:rechnungen(id, nummer), bestellung:bestellungen(id, nummer), fall:service_faelle(id, nummer)`

type Name = { name: string } | null
type Roh = Omit<Mail, 'zustaendig' | 'vertretung_fuer' | 'erledigt_von' | 'kontakt'> & {
  zustaendig: Name
  vertreten: Name
  erledigt: Name
  kontakt: { id: string; vorname: string | null; nachname: string | null; firma: string | null; sprache: string } | null
}

const kontaktName = (k: NonNullable<Roh['kontakt']>) =>
  [k.vorname, k.nachname].filter(Boolean).join(' ') || k.firma || '–'

/** Rohzeile → Mail (Namen statt verschachtelter Objekte). */
export function alsMail({ zustaendig, vertreten, erledigt, kontakt, ...m }: Roh): Mail {
  return {
    ...m,
    zustaendig: zustaendig?.name ?? null,
    vertretung_fuer: vertreten?.name ?? null,
    erledigt_von: erledigt?.name ?? null,
    kontakt: kontakt ? { id: kontakt.id, name: kontaktName(kontakt), sprache: kontakt.sprache } : null,
  }
}

/** Alles Offene und was in den letzten 14 Tagen erledigt oder abgelegt wurde (RLS zeigt nur, was ich sehen darf). */
export async function ladeMails(): Promise<Mail[]> {
  const seit = new Date(Date.now() - 14 * 86_400_000).toISOString()
  const { data, error } = await db()
    .from('posteingang')
    .select(FELDER)
    .is('geloescht_am', null)
    .or(`stand.in.(neu,offen,info),eingang_am.gte.${seit}`)
    .order('eingang_am', { ascending: false })
    .limit(1500)
  if (error) throw error
  return (data as unknown as Roh[]).map(alsMail)
}

/** Änderung über die Datenbank-Funktion (sie prüft, ob ich die Mail sehen darf). */
async function setzen(id: string, aktion: string, p: Record<string, unknown> = {}): Promise<void> {
  const { error } = await db().rpc('posteingang_setzen', { p_id: id, p_aktion: aktion, p: p as never })
  if (error) throw error
}

/** Erledigt ohne Antwort (z. B. Auftragsbestätigung gelesen). */
export const erledigen = (id: string) => setzen(id, 'erledigt')
/** Wieder offen (Frist bleibt, wie sie war). */
export const oeffnen = (id: string) => setzen(id, 'oeffnen')
/** Ablegen (Werbung, nichts zu tun). */
export const ablegen = (id: string) => setzen(id, 'ablegen')
/** Einer anderen Person weitergeben (sie bekommt die Glocke). */
export const zuweisen = (id: string, personId: string) => setzen(id, 'zuweisen', { person_id: personId })
/** Art von Hand ändern; Zuständigkeit und Frist werden neu bestimmt. */
export const artAendern = (id: string, art: Art) => setzen(id, 'art', { art })
/** Mit einem Kunden verknüpfen; danach sucht die Datenbank Projekt, Lead und Service-Fall. */
export const kundeVerknuepfen = (id: string, kontaktId: string) => setzen(id, 'verknuepfen', { kontakt_id: kontaktId })

/** Volltext aus Outlook (nur wenn die Microsoft-Verbindung steht). */
export const ladeText = (id: string) => microsoft.posteingangText(id).then((r) => r.text)

/** Jetzt holen statt auf den Zeitplan zu warten. */
export const jetztAbholen = () => microsoft.posteingangAbholen()

/** Auswertung der Reaktionszeit. */
export async function ladeAuswertung(wochen = 8): Promise<Auswertung> {
  const { data, error } = await db().rpc('posteingang_auswertung', { p_wochen: wochen })
  if (error) throw error
  return data as unknown as Auswertung
}

/** Einstellung «posteingang». */
export async function ladeRegeln(): Promise<PosteingangRegeln> {
  const { data, error } = await db().from('einstellungen').select('wert').eq('schluessel', 'posteingang').maybeSingle()
  if (error) throw error
  return (data?.wert ?? {}) as unknown as PosteingangRegeln
}

/** Einstellung speichern (nur Administration; die Datenbank prüft das). «aktiv_seit» bleibt, wie es war. */
export async function speichereRegeln(neu: Omit<PosteingangRegeln, 'aktiv_seit'>): Promise<void> {
  const alt = await ladeRegeln()
  const { error } = await db()
    .from('einstellungen')
    .update({ wert: { ...alt, ...neu, aktiv_seit: alt.aktiv_seit } as never })
    .eq('schluessel', 'posteingang')
  if (error) throw error
}

/** Aktive Personen für Zuständigkeit und Weitergeben. */
export async function ladePersonen(): Promise<Person[]> {
  const { data, error } = await db()
    .from('personen')
    .select('id, kuerzel, name')
    .eq('aktiv', true)
    .is('geloescht_am', null)
    .order('name')
  if (error) throw error
  return data
}
