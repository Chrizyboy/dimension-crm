import { verkleinern } from '@/lib/bild'
import { dokumentAdresse } from '@/services/dokumente'
import { rufeFunktion } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import type { Format, Referenzanlage, SocialPost, SocialVerbindung } from '../types'

/**
 * Datenzugriff Social Media. Freigeben, Zurückziehen und «erledigt» prüft die Datenbank (social_*); gepostet wird
 * nur auf dem Server (Edge Function «social» oder der Zeitplan), nie aus der App direkt zu Meta oder LinkedIn.
 */
function db() {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  return supabase
}

const FELDER =
  'id, thema, idee, netzwerke, format, sprache, texte, bilder, status, geplant_am, veroeffentlicht_am, ergebnis, details, verfasst_von, erstellt_am'

/** Alle Posts (ohne Papierkorb), neueste zuerst. */
export async function ladePosts(): Promise<SocialPost[]> {
  const { data, error } = await db()
    .from('social_posts')
    .select(FELDER)
    .is('geloescht_am', null)
    .order('erstellt_am', { ascending: false })
    .limit(500)
  if (error) throw error
  return data as unknown as SocialPost[]
}

/** Entwurf speichern (neu oder ändern); gibt die ID zurück. */
export async function speicherePost(p: Partial<SocialPost> & { id?: string }): Promise<string> {
  const werte = {
    thema: p.thema ?? null,
    idee: p.idee ?? null,
    netzwerke: p.netzwerke ?? [],
    format: p.format ?? 'quadrat',
    sprache: p.sprache ?? 'de',
    texte: (p.texte ?? {}) as never,
    bilder: (p.bilder ?? []) as never,
    details: (p.details ?? {}) as never,
  }
  if (p.id) {
    const { error } = await db().from('social_posts').update(werte).eq('id', p.id)
    if (error) throw error
    return p.id
  }
  const { data, error } = await db()
    .from('social_posts')
    .insert({ ...werte, verfasst_von: p.verfasst_von ?? null })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Freigeben und planen (ohne Zeitpunkt: sofort beim nächsten Lauf). */
export async function freigeben(id: string, zeitpunkt: string | null) {
  const { error } = await db().rpc('social_freigeben', { p_id: id, ...(zeitpunkt ? { p_zeitpunkt: zeitpunkt } : {}) })
  if (error) throw error
}

/** Geplanten Post zurück in den Entwurf. */
export async function zurueckziehen(id: string) {
  const { error } = await db().rpc('social_zurueckziehen', { p_id: id })
  if (error) throw error
}

/** Von Hand gepostet: als erledigt ablegen. */
export async function erledigt(id: string) {
  const { error } = await db().rpc('social_erledigt', { p_id: id })
  if (error) throw error
}

/** Post in den Papierkorb. */
export async function postPapierkorb(id: string) {
  const { error } = await db().from('social_posts').update({ geloescht_am: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

/** Freigegebenen Post sofort veröffentlichen (Server). */
export const jetztVeroeffentlichen = (id: string) =>
  rufeFunktion<{ status: string; ergebnis: SocialPost['ergebnis'] }>('social', 'veroeffentlichen', { id })

/** Verbindungen (ohne Token). */
export async function ladeVerbindungen(): Promise<SocialVerbindung[]> {
  const { data, error } = await db().rpc('social_verbindungen')
  if (error) throw error
  return data as SocialVerbindung[]
}

/** Welche Dienste auf dem Server eingerichtet sind und die Rückruf-Adresse. */
export const socialStatus = () =>
  rufeFunktion<{ eingerichtet: Record<'meta' | 'linkedin' | 'canva', boolean>; rueckruf: string }>('social', 'status')

/** Anmeldung bei Meta, LinkedIn oder Canva im neuen Fenster (nur Admins). */
export async function verbinden(dienst: SocialVerbindung['dienst'], sprache: 'de' | 'fr') {
  const { adresse } = await rufeFunktion<{ adresse: string }>('social', 'verbinden', { dienst, sprache })
  window.open(adresse, '_blank', 'noopener')
}

/** Verbindung trennen (nur Admins). */
export const trennen = (dienst: SocialVerbindung['dienst']) => rufeFunktion('social', 'trennen', { dienst })

/** Leeres Canva-Design im Format anlegen und in Canva öffnen. */
export async function canvaNeu(format: Format, titel: string) {
  const r = await rufeFunktion<{ id: string; adresse: string }>('social', 'canva_neu', { format, titel })
  window.open(r.adresse, '_blank', 'noopener')
  return r
}

/** Fertiges Canva-Design als PNG zum Post holen; gibt die Dokument-ID zurück. */
export async function canvaHolen(postId: string, designId: string): Promise<string> {
  return (
    await rufeFunktion<{ dokument_id: string }>('social', 'canva_holen', { post_id: postId, design_id: designId })
  ).dokument_id
}

/** Eigenes Foto hochladen (verkleinert) und als Dokument im Ordner «marketing» ablegen. */
export async function bildHochladen(postId: string, datei: File): Promise<string> {
  const blob = await verkleinern(datei)
  const name = datei.name.replace(/\.[^.]+$/, '') + '.jpg'
  const pfad = `marketing/${postId}/${String(Date.now())}-${name.replace(/[^\w.-]+/g, '_')}`
  const hoch = await db()
    .storage.from('dokumente')
    .upload(pfad, blob, { contentType: blob.type || 'image/jpeg' })
  if (hoch.error) throw hoch.error
  const { data, error } = await db()
    .from('dokumente')
    .insert({
      name,
      mime_typ: blob.type || 'image/jpeg',
      bytes: blob.size,
      ordner: 'marketing',
      speicher: 'intern',
      speicher_pfad: pfad,
      bezug_tabelle: 'social_posts',
      bezug_id: postId,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Adressen zum Anzeigen der Bilder (kurz gültig). */
export async function bildAdressen(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {}
  const { data, error } = await db().from('dokumente').select('id, sharepoint_url, speicher_pfad').in('id', ids)
  if (error) throw error
  const paare = await Promise.all(data.map(async (d) => [d.id, (await dokumentAdresse(d)) ?? ''] as const))
  return Object.fromEntries(paare)
}

/** Verbaute Anlagen als Vorlage: Ort, Leistung, Module, Wechselrichter, Batterie, Datum, nie der Name. */
export async function ladeReferenzanlagen(): Promise<Referenzanlage[]> {
  const { data, error } = await db()
    .from('anlagen')
    .select('id, leistung_kwp, komponenten, ibn_am, objekte(ort, gemeinde)')
    .is('geloescht_am', null)
    .order('ibn_am', { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) throw error
  type Komponente = { art?: string; modell?: string | null; anzahl?: number | null }
  return (
    data as unknown as {
      id: string
      leistung_kwp: number | null
      komponenten: Komponente[] | null
      ibn_am: string | null
      objekte: { ort: string | null; gemeinde: string | null } | null
    }[]
  ).map((a) => {
    const k = (art: string) => {
      const x = (a.komponenten ?? []).find((c) => c.art === art)
      return x ? [x.anzahl ? `${String(x.anzahl)}×` : '', x.modell ?? ''].join(' ').trim() || '✓' : null
    }
    return {
      id: a.id,
      ort: a.objekte?.gemeinde ?? a.objekte?.ort ?? null,
      leistung_kwp: a.leistung_kwp,
      module: k('pv'),
      wechselrichter: k('wechselrichter'),
      batterie: k('batterie'),
      datum: a.ibn_am,
    }
  })
}
