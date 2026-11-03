import { supabase } from '@/services/supabase'
import type {
  OhneVertrag,
  PlanPerson,
  Filter,
  Katalog,
  KundenAnlage,
  Leistung,
  Vertrag,
  VertragEingabe,
  VertragRechnung,
  Wartung,
} from '../types'

/** Datenzugriff für Wartungsverträge. */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER =
  'id, nummer, status, kontakt_id, projekt_id, anlage_id, paket, anlage_kwp, speicher_kwh, ibn_jahr, wechselrichter, anlage_ort, ' +
  'fremdanlage, start_am, laufzeit_jahre, rhythmus_monate, preis_rappen, preis_netto_rappen, tarif_netto_rappen, bestandsaufnahme, ' +
  'leistungen, letzte_wartung, naechste_wartung, gekuendigt_am, gekuendigt_per, verrechnet_bis, termin_von, termin_bis, termin_person_id, angekuendigt_am, sprache, notiz, verlauf, ' +
  'kontakt:kontakte(vorname, nachname, firma, sprache, telefon, objekte(strasse, plz, ort)), projekt:projekte(nummer)'

interface Roh extends Omit<
  Vertrag,
  'kunde' | 'telefon' | 'adresse' | 'ort' | 'projekt' | 'leistungen' | 'verlauf' | 'sprache' | 'bestandsaufnahme'
> {
  sprache: string | null
  bestandsaufnahme: string
  leistungen: unknown
  verlauf: unknown
  kontakt: {
    vorname: string | null
    nachname: string | null
    firma: string | null
    sprache: string | null
    telefon: string | null
    objekte: { strasse: string | null; plz: string | null; ort: string | null }[]
  } | null
  projekt: { nummer: string } | null
}

function alsVertrag({ kontakt: k, projekt, leistungen, verlauf, sprache, bestandsaufnahme, ...v }: Roh): Vertrag {
  const o = k?.objekte[0]
  const name = k ? k.firma?.trim() || [k.vorname, k.nachname].filter(Boolean).join(' ') || '–' : '–'
  return {
    ...v,
    sprache: (sprache ?? k?.sprache) === 'fr' ? 'fr' : 'de',
    bestandsaufnahme: bestandsaufnahme as Vertrag['bestandsaufnahme'],
    telefon: k?.telefon ?? null,
    leistungen: Array.isArray(leistungen) ? (leistungen as Leistung[]) : [],
    verlauf: Array.isArray(verlauf) ? (verlauf as Wartung[]) : [],
    kunde: name,
    adresse: [name, o?.strasse, [o?.plz, o?.ort].filter(Boolean).join(' ')].filter((x): x is string => Boolean(x)),
    ort: o?.ort ?? null,
    projekt: projekt?.nummer ?? null,
  }
}

/**
 * Verträge nach Filter. `bis` = heute + 30 Tage (fällig), `rechnungBis` = heute + Vorlauf der Jahresrechnung.
 * «Kündbar bald» rechnet die Liste selbst (Ablauf hängt vom Stichtag ab).
 */
export async function ladeVertraege(filter: Filter, bis: string, rechnungBis: string): Promise<Vertrag[]> {
  let q = db().from('wartungsvertraege').select(FELDER).is('geloescht_am', null)
  if (filter === 'aktiv' || filter === 'faellig' || filter === 'kuendbar') q = q.eq('status', 'aktiv')
  if (filter === 'gekuendigt') q = q.eq('status', 'gekuendigt')
  if (filter === 'rechnung') q = q.in('status', ['aktiv', 'gekuendigt']).not('paket', 'is', null)
  if (filter === 'faellig') q = q.lte('naechste_wartung', bis)
  const { data, error } = await q.order('naechste_wartung', { nullsFirst: false })
  if (error) throw error
  const liste = (data as unknown as Roh[]).map(alsVertrag)
  return filter === 'rechnung'
    ? liste.filter((v) => v.start_am && (v.verrechnet_bis ? naechsterTag(v.verrechnet_bis) : v.start_am) <= rechnungBis)
    : liste
}

function naechsterTag(iso: string): string {
  const [j, m, t] = iso.split('-').map(Number)
  const d = new Date(j ?? 1970, (m ?? 1) - 1, (t ?? 1) + 1)
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Ein Vertrag für die Akte. */
export async function ladeVertrag(id: string): Promise<Vertrag> {
  const { data, error } = await db().from('wartungsvertraege').select(FELDER).eq('id', id).single()
  if (error) throw error
  return alsVertrag(data as unknown as Roh)
}

/** Vertrag anlegen (Nummer und erste Wartung setzt die Datenbank) oder ändern; gibt die ID zurück. */
export async function vertragSpeichern(e: VertragEingabe, id?: string): Promise<string> {
  const felder = { ...e, leistungen: e.leistungen as never }
  if (id) {
    const { error } = await db().from('wartungsvertraege').update(felder).eq('id', id)
    if (error) throw error
    return id
  }
  const { data, error } = await db().from('wartungsvertraege').insert(felder).select('id').single()
  if (error) throw error
  return data.id
}

/** Wartung durchgeführt; gibt die nächste Wartung zurück. */
export async function wartungErledigt(id: string, am: string, notiz: string): Promise<string | null> {
  const { data, error } = await db().rpc('wartung_erledigt', { p_id: id, p_am: am, p_notiz: notiz })
  if (error) throw error
  // Essentiel hat keine Inspektionen: dann gibt es keine nächste Wartung.
  return data || null
}

/** Pakete, Preise und Bedingungen der Website (Einstellung «wartung_pakete», Regel 8: Daten statt Code). */
export async function ladeKatalog(): Promise<Katalog | null> {
  const { data, error } = await db()
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'wartung_pakete')
    .maybeSingle()
  if (error) throw error
  return (data?.wert as unknown as Katalog | undefined) ?? null
}

/** Kündigung erfassen; gibt das Vertragsende zurück. */
export async function wartungKuendigen(id: string, am: string): Promise<string> {
  const { data, error } = await db().rpc('wartung_kuendigen', { p_id: id, p_am: am })
  if (error) throw error
  return data
}

/** Kündigung zurücknehmen. */
export async function kuendigungZuruecknehmen(id: string): Promise<void> {
  const { error } = await db().rpc('wartung_kuendigung_zuruecknehmen', { p_id: id })
  if (error) throw error
}

/** Jahresrechnung für das nächste Vertragsjahr als Entwurf (Recht finanzen); gibt die Rechnung zurück. */
export async function jahresrechnungErstellen(id: string): Promise<string> {
  const { data, error } = await db().rpc('wartung_rechnung_erstellen', { p_id: id })
  if (error) throw error
  return data
}

/** Rechnungen eines Vertrags, neueste zuerst. */
export async function ladeVertragRechnungen(id: string): Promise<VertragRechnung[]> {
  const { data, error } = await db()
    .from('rechnungen')
    .select('id, nummer, status, datum, total_rappen, titel')
    .eq('wartungsvertrag_id', id)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
  if (error) throw error
  return data
}

/** Anlagen eines Kunden (über seine Gebäude) zum Vorfüllen: kWp, Inbetriebnahme, Wechselrichter. */
export async function ladeKundenAnlagen(kontaktId: string): Promise<KundenAnlage[]> {
  const { data, error } = await db()
    .from('anlagen')
    .select(
      'id, projekt_id, leistung_kwp, ibn_am, komponenten, objekt:objekte!inner(kontakt_id, strasse, ort), projekt:projekte(nummer)',
    )
    .eq('objekt.kontakt_id', kontaktId)
    .is('geloescht_am', null)
  if (error) throw error
  return (
    data as unknown as {
      id: string
      projekt_id: string | null
      leistung_kwp: number | null
      ibn_am: string | null
      komponenten: unknown
      objekt: { strasse: string | null; ort: string | null }
      projekt: { nummer: string } | null
    }[]
  ).map((a) => {
    const teile = Array.isArray(a.komponenten)
      ? (a.komponenten as { art?: string; hersteller?: string; modell?: string }[])
      : []
    const wr = teile.find((k) => k.art === 'wechselrichter')
    return {
      id: a.id,
      projekt_id: a.projekt_id,
      projekt: a.projekt?.nummer ?? null,
      kwp: a.leistung_kwp,
      ibn_jahr: a.ibn_am ? Number(a.ibn_am.slice(0, 4)) : null,
      wechselrichter: wr ? [wr.hersteller, wr.modell].filter(Boolean).join(' ') || null : null,
      ort: [a.objekt.strasse, a.objekt.ort].filter(Boolean).join(', '),
    }
  })
}

/** Projekte eines Kunden für die Zuordnung. */
export async function ladeKundenProjekte(kontaktId: string): Promise<{ id: string; nummer: string }[]> {
  const { data, error } = await db()
    .from('projekte')
    .select('id, nummer')
    .eq('kontakt_id', kontaktId)
    .is('geloescht_am', null)
  if (error) throw error
  return data
}

/** Termin der nächsten Inspektion setzen oder leeren (von = null). */
export async function terminSetzen(id: string, von: string | null, bis: string | null, person: string | null) {
  const { error } = await db().rpc('wartung_termin_setzen', {
    p_id: id,
    p_von: von as string,
    p_bis: bis as string,
    p_person: person as string,
  })
  if (error) throw error
}

/** Ankündigung sofort in den Ausgangskorb (sonst legt sie der Zeitplan 14 Tage vorher an). */
export async function jetztAnkuendigen(id: string): Promise<void> {
  const { error } = await db().rpc('wartung_ankuendigen', { p_id: id })
  if (error) throw error
}

/** Personen, die Inspektionen machen können (aktive Personen). */
export async function ladePlanPersonen(): Promise<PlanPerson[]> {
  const { data, error } = await db().from('personen').select('id, name').eq('aktiv', true).order('name')
  if (error) throw error
  return data
}

/** Eigene Anlagen ohne Wartungsvertrag. */
export async function ladeOhneVertrag(): Promise<OhneVertrag[]> {
  const { data, error } = await db().from('wartung_ohne_vertrag').select('*').order('ibn_am', { ascending: false })
  if (error) throw error
  return data as unknown as OhneVertrag[]
}

/** Angebot an eine oder mehrere Anlagen (Serie) über den Ausgangskorb; gibt die Zahl zurück. */
export async function angebotSenden(anlagen: string[], paket?: string): Promise<number> {
  const { data, error } = await db().rpc('wartung_angebot_senden', {
    p_anlagen: anlagen,
    ...(paket ? { p_paket: paket } : {}),
  })
  if (error) throw error
  return data
}

/** Was aus dem letzten Angebot wurde. */
export async function angebotStand(anlage: string, stand: 'angenommen' | 'abgelehnt' | 'offen'): Promise<void> {
  const { error } = await db().rpc('wartung_angebot_stand', { p_anlage: anlage, p_stand: stand })
  if (error) throw error
}
