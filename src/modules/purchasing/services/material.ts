import type { ArtikelTreffer, MaterialProjekt, MaterialZeile } from '../types'
import { db } from './bestellungen'

/** Datenzugriff für die Materialliste je Projekt. */

interface ProjektRoh {
  id: string
  nummer: string
  titel: string | null
  status: string
  baubeginn: string | null
  material_status: string | null
  kontakt: { vorname: string | null; nachname: string | null; firma: string | null } | null
  objekt: { ort: string | null } | null
}

/** Offene Projekte (Auftrag, im Bau) für die Material-Übersicht, nächster Baubeginn zuerst. */
export async function ladeMaterialProjekte(): Promise<MaterialProjekt[]> {
  const { data, error } = await db()
    .from('projekte')
    .select(
      'id, nummer, titel, status, baubeginn, material_status, kontakt:kontakte(vorname, nachname, firma), objekt:objekte(ort)',
    )
    .is('geloescht_am', null)
    .in('status', ['auftrag', 'im_bau'])
    .order('baubeginn', { nullsFirst: false })
    .order('nummer')
    .limit(2000)
  if (error) throw error
  return (data as unknown as ProjektRoh[]).map(({ kontakt: k, objekt, ...p }) => ({
    ...p,
    kunde: (k && (k.firma?.trim() || [k.vorname, k.nachname].filter(Boolean).join(' '))) || '–',
    ort: objekt?.ort ?? null,
  }))
}

/** Projekte mit Materialliste: Zahl der Zeilen und der Zeilen, bei denen noch etwas fehlt. */
export async function ladeMaterialZaehler(): Promise<Map<string, { zeilen: number; fehlt: number }>> {
  const { data, error } = await db().from('projekt_material_stand').select('projekt_id, fehlt').limit(10000)
  if (error) throw error
  const m = new Map<string, { zeilen: number; fehlt: number }>()
  for (const z of data) {
    const id = z.projekt_id ?? ''
    const alt = m.get(id) ?? { zeilen: 0, fehlt: 0 }
    m.set(id, { zeilen: alt.zeilen + 1, fehlt: alt.fehlt + ((z.fehlt ?? 0) > 0 ? 1 : 0) })
  }
  return m
}

/** Materialliste eines Projekts mit Deckung. */
export async function ladeMaterial(projektId: string): Promise<MaterialZeile[]> {
  const { data, error } = await db()
    .from('projekt_material_stand')
    .select('*')
    .eq('projekt_id', projektId)
    .order('reihenfolge')
  if (error) throw error
  return data as unknown as MaterialZeile[]
}

/** Zeile anlegen oder ändern. */
export async function zeileSpeichern(z: {
  id?: string
  projekt_id: string
  artikel_id: string | null
  bezeichnung: string
  menge: number
  einheit: string
  notiz: string | null
}): Promise<void> {
  const { id, ...felder } = z
  const { error } = id
    ? await db().from('projekt_material').update(felder).eq('id', id)
    : await db()
        .from('projekt_material')
        .insert({ ...felder, quelle: 'hand', reihenfolge: 1000 })
  if (error) throw error
}

/** Zeile entfernen (Papierkorb). */
export async function zeileEntfernen(id: string): Promise<void> {
  const { error } = await db().from('projekt_material').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Materialliste aus Kalkulation oder Offerte vorschlagen; gibt die Zahl der Zeilen zurück. */
export async function materialVorschlagen(projektId: string): Promise<number> {
  const { data, error } = await db().rpc('projekt_material_vorschlagen', { p_projekt: projektId })
  if (error) throw error
  return data
}

/** Bestellvorschlag: zuerst Lager reservieren, dann Entwürfe beim günstigsten Lieferanten. */
export async function bestellvorschlag(
  projektId: string,
): Promise<{ reserviert: number; bestellungen: string[]; ohne_lieferant: number }> {
  const { data, error } = await db().rpc('bestellvorschlag', { p_projekt: projektId })
  if (error) throw error
  return data as unknown as { reserviert: number; bestellungen: string[]; ohne_lieferant: number }
}

/** Artikel der Preisliste suchen (Name oder Artikelnummer), ohne archivierte. */
export async function sucheArtikel(text: string): Promise<ArtikelTreffer[]> {
  const s = text.trim().replace(/[%,()]/g, ' ')
  const { data, error } = await db()
    .from('artikel')
    .select('id, name, artikelnummer, einheit')
    .is('geloescht_am', null)
    .is('archiviert_am', null)
    .or(`name.ilike.%${s}%,artikelnummer.ilike.%${s}%`)
    .order('name')
    .limit(8)
  if (error) throw error
  return data
}

/** Einkaufspreis eines Artikels beim Lieferanten (nur mit Recht «preise» lesbar). */
export async function lieferantenpreis(
  artikelId: string,
  lieferantId: string,
): Promise<{ ek_rappen: number | null; artikelnummer: string | null } | null> {
  const { data, error } = await db()
    .from('lieferantenpreise')
    .select('ek_rappen, artikelnummer')
    .eq('artikel_id', artikelId)
    .eq('lieferant_id', lieferantId)
    .is('geloescht_am', null)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Baustelle mit fehlendem Material für den Reiter «Zu bestellen» (Datenbank: zu_bestellen). */
export interface ZuBestellen {
  projekt_id: string
  nummer: string
  kunde: string | null
  ort: string | null
  baubeginn: string | null
  bestellen_bis: string | null
  zeilen_fehlen: number
  zeilen_ohne_artikel: number
}

/** Alle Baustellen mit fehlendem Material, früheste «bestellen bis» zuerst. */
export async function ladeZuBestellen(): Promise<ZuBestellen[]> {
  const { data, error } = await db().rpc('zu_bestellen')
  if (error) throw error
  return data
}

/** Entwürfe eines Lieferanten ans selbe Lager zu einer Sammelbestellung zusammenfassen. */
export async function zusammenfassen(lieferantId: string, lagerortId: string): Promise<string> {
  const { data, error } = await db().rpc('bestellungen_zusammenfassen', {
    p_lieferant: lieferantId,
    p_lagerort: lagerortId,
  })
  if (error) throw error
  return data
}

/** Preis eines Artikels bei einem Lieferanten, für den Vergleich in der Bestellung. */
export interface Vergleichspreis {
  artikel_id: string
  lieferant_id: string
  lieferant: string
  ek_rappen: number
}

/** Alle Lieferantenpreise der Artikel (aktive Lieferanten), günstigste zuerst. */
export async function ladeVergleichspreise(artikelIds: string[]): Promise<Vergleichspreis[]> {
  if (artikelIds.length === 0) return []
  const { data, error } = await db()
    .from('lieferantenpreise')
    .select('artikel_id, lieferant_id, ek_rappen, lieferant:lieferanten!inner(name, aktiv)')
    .in('artikel_id', artikelIds)
    .is('geloescht_am', null)
    .not('ek_rappen', 'is', null)
    .eq('lieferant.aktiv', true)
    .order('ek_rappen')
  if (error) throw error
  return (
    data as unknown as { artikel_id: string; lieferant_id: string; ek_rappen: number; lieferant: { name: string } }[]
  ).map((z) => ({
    artikel_id: z.artikel_id,
    lieferant_id: z.lieferant_id,
    lieferant: z.lieferant.name,
    ek_rappen: z.ek_rappen,
  }))
}
