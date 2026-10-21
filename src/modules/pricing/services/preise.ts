import { supabase } from '@/services/supabase'
import type { Database, Json } from '@/types/datenbank'
import type { Artikel, Datenblaetter, ImportZeile, Lieferantenpreis } from '../types'

type Zeile = Database['public']['Views']['preisliste']['Row']

function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

function datenblaetterAus(roh: Json | null): Datenblaetter {
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return {}
  const r = roh as Record<string, unknown>
  const text = (k: string) => (typeof r[k] === 'string' && r[k] !== '-' && r[k] !== '' ? r[k] : undefined)
  return { de: text('de'), fr: text('fr'), en: text('en'), fam: text('fam'), hint: text('hint'), stand: text('stand') }
}

/** Zeile der Preisliste in die App-Form. */
export function artikelAusZeile(z: Zeile): Artikel {
  return {
    id: z.id ?? '',
    artikelnummer: z.artikelnummer,
    name: z.name ?? '',
    kategorie: z.kategorie ?? '',
    gruppe: z.hersteller_gruppe,
    einheit: z.einheit ?? 'Stk',
    leistungW: z.leistung_w,
    masse: z.masse,
    masseArt: z.masse_art,
    gewichtKg: z.gewicht_kg,
    datenblaetter: datenblaetterAus(z.datenblaetter),
    nachfolgerId: z.nachfolger_id,
    archiviertAm: z.archiviert_am,
    archiviertVon: z.archiviert_von,
    archivGrund: z.archiv_grund,
    vkRappen: z.vk_rappen,
    ekRappen: z.ek_rappen,
    marge: z.marge,
    skonto: z.skonto,
    rabatt: z.rabatt,
    lieferant: z.lieferant,
    ekStand: z.ek_stand,
    suchtext: z.suchtext ?? '',
  }
}

/** Alle Artikel (aktuell und archiviert). Ohne Recht «preise» fehlen EK, Marge und Lieferant. */
export async function ladePreisliste(): Promise<Artikel[]> {
  const { data, error } = await db().from('preisliste').select('*').order('hersteller_gruppe').order('name')
  if (error) throw error
  return data.map(artikelAusZeile)
}

/** Preise aller Lieferanten für einen Artikel, günstigster zuerst (V121). */
export async function ladeLieferantenpreise(artikelId: string): Promise<Lieferantenpreis[]> {
  const { data, error } = await db()
    .from('lieferantenpreise')
    .select('id, lieferant_id, artikelnummer, ek_rappen, stand, lieferanten(name)')
    .eq('artikel_id', artikelId)
    .is('geloescht_am', null)
    .order('ek_rappen', { nullsFirst: false })
  if (error) throw error
  return data.map((z) => ({
    id: z.id,
    lieferantId: z.lieferant_id,
    lieferant: z.lieferanten?.name ?? null,
    artikelnummer: z.artikelnummer,
    ekRappen: z.ek_rappen,
    stand: z.stand,
  }))
}

/** Lieferanten für die Auswahl (z. B. Krannich, Solarmarkt, Tritec). */
export async function ladeLieferanten(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db().from('lieferanten').select('id, name').is('geloescht_am', null).order('name')
  if (error) throw error
  return data
}

/** Lieferantenpreis erfassen oder ändern; der günstigste wird automatisch zum EK der Preisliste. */
export async function speichereLieferantenpreis(
  artikelId: string,
  p: {
    id?: string
    lieferant_id: string | null
    artikelnummer: string | null
    ek_rappen: number | null
    stand: string
  },
) {
  const { id, ...werte } = p
  const { error } = id
    ? await db().from('lieferantenpreise').update(werte).eq('id', id)
    : await db()
        .from('lieferantenpreise')
        .insert({ artikel_id: artikelId, ...werte })
  if (error) throw error
}

/** Lieferantenpreis in den Papierkorb legen. */
export async function entferneLieferantenpreis(id: string) {
  const { error } = await db().from('lieferantenpreise').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Inline-Bearbeitung (V87): Wp, EK, Marge, Skonto (Anteile, 0.25 = 25 %). */
export async function setzePreis(
  artikelId: string,
  p: Partial<{ leistung_w: number | null; ek_rappen: number | null; marge: number | null; skonto: number | null }>,
) {
  const { error } = await db().rpc('artikel_preis_setzen', { p_artikel: artikelId, p: p as Json })
  if (error) throw error
}

/** Archivieren mit Grund und optionalem Nachfolger; `grund = null` stellt wieder her. */
export async function archiviere(artikelId: string, grund: string | null, nachfolger: string | null = null) {
  const { error } = await db().rpc('artikel_archivieren', {
    p_artikel: artikelId,
    p_grund: grund as string,
    ...(nachfolger ? { p_nachfolger: nachfolger } : {}),
  })
  if (error) throw error
}

/** Angaben am Artikel: Masse, Gewicht, Datenblätter, Nachfolger (nur mit Recht «preise»). */
export async function setzeArtikel(
  artikelId: string,
  p: Partial<{
    masse: string | null
    masse_art: string | null
    gewicht_kg: number | null
    datenblaetter: Datenblaetter
    nachfolger_id: string | null
  }>,
) {
  const { error } = await db()
    .from('artikel')
    .update(p as Database['public']['Tables']['artikel']['Update'])
    .eq('id', artikelId)
  if (error) throw error
}

/** Datenblatt als Datei ablegen; zurück kommt der Verweis für `datenblaetter` («dokumente:pfad»). */
export async function legeDatenblattAb(artikelId: string, sprache: 'de' | 'fr' | 'en', datei: File): Promise<string> {
  const name = datei.name.replace(/[^\w.-]+/g, '_')
  const pfad = `artikel/${artikelId}/${sprache}-${Date.now()}-${name}`
  const { error } = await db()
    .storage.from('dokumente')
    .upload(pfad, datei, { contentType: datei.type || 'application/pdf' })
  if (error) throw error
  return `dokumente:${pfad}`
}

/** Excel übernehmen; mit `pruefen` wird nur gezählt (gelesen, geändert, neu, gleich). */
export async function importiere(zeilen: ImportZeile[], pruefen: boolean) {
  const { data, error } = await db().rpc('preise_importieren', {
    p_zeilen: zeilen as unknown as Json,
    p_pruefen: pruefen,
  })
  if (error) throw error
  const r = (data ?? {}) as Record<string, number>
  return { gelesen: r.gelesen ?? 0, geaendert: r.geaendert ?? 0, neu: r.neu ?? 0, gleich: r.gleich ?? 0 }
}
