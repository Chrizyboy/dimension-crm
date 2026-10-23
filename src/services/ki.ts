import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { verkleinern } from '@/lib/bild'
import { rufeFunktion } from './integrationen'
import { supabase } from './supabase'

/**
 * KI-Funktionen (Phase 13) für alle Module. Die App schickt nur «was» und den Bezug; den Kontext liest der
 * Server selbst (mit den Rechten der Person), ruft Claude auf und protokolliert die Kosten. Alles, was
 * zurückkommt, ist ein Vorschlag: gespeichert oder gesendet wird erst nach dem Klick eines Menschen.
 */

/** Wozu ein Kunden-Text dient (V233 KI-Assistent, Arten). */
export const KUNDEN_ARTEN = [
  'nachfassen',
  'antwort',
  'termin',
  'offerte',
  'offerttext',
  'auftrag',
  'zahlung',
  'service',
  'frei',
] as const
export type KundenArt = (typeof KUNDEN_ARTEN)[number]

/** Wovon die KI Kontext lesen darf. */
export type KiBezugTabelle = 'kontakte' | 'verkaufschancen' | 'offerten' | 'projekte' | 'service_faelle'
export interface KiBezug {
  tabelle: KiBezugTabelle
  id: string
}

export type Sprache = 'de' | 'fr'

export interface KiEntwurf {
  betreff: string
  text: string
  hinweise: string[]
  sprache: Sprache
  an: string | null
  anhaenge: { gelesen: string[]; uebersprungen: string[] }
}

export interface KiStatus {
  eingerichtet: boolean
  aktiv: boolean
  budget: { heute_millirappen: number; person_millirappen: number; limit_rappen: number; frei: boolean }
}

/** Ruft eine Aktion der Edge Function «ki» auf (Fehler als IntegrationsFehler mit Code, z. B. «ki_limit»). */
export function rufeKi<T extends object>(aktion: string, eingabe: Record<string, unknown> = {}): Promise<T> {
  return rufeFunktion<T>('ki', aktion, eingabe)
}

/** Ist die KI eingerichtet und heute noch Budget frei? (Knöpfe zeigen sonst einen Hinweis.) */
export function useKiStatus() {
  return useQuery({
    queryKey: ['ki', 'status'],
    enabled: Boolean(supabase),
    staleTime: 60_000,
    retry: false,
    queryFn: () => rufeKi<KiStatus>('status'),
  })
}

/** Nach einem Aufruf: Budget neu laden (die Kosten sind gestiegen). */
export function useKiNachher() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['ki', 'status'] })
    void qc.invalidateQueries({ queryKey: ['ki', 'kosten'] })
  }
}

/** Kundentext schreiben oder überarbeiten. */
export function kiEntwurf(e: {
  art: KundenArt
  bezug?: KiBezug | null
  sprache?: Sprache
  wunsch?: string
  eingang?: string
  bisher?: { betreff: string; text: string } | null
  wuensche?: string[]
  anhaenge?: boolean
}): Promise<KiEntwurf> {
  return rufeKi<KiEntwurf>('entwurf', {
    art: e.art,
    ...(e.bezug ? { tabelle: e.bezug.tabelle, id: e.bezug.id } : {}),
    ...(e.sprache ? { sprache: e.sprache } : {}),
    wunsch: e.wunsch ?? '',
    eingang: e.eingang ?? '',
    bisher: e.bisher ?? null,
    wuensche: e.wuensche ?? [],
    anhaenge: e.anhaenge ?? false,
  })
}

/**
 * Schreibstil lernen, nachdem eine Person einen KI-Text verschickt hat. Unverändert kostet es nichts;
 * Fehler hier stören niemanden (der Text ist ja schon unterwegs).
 */
export function kiStilLernen(e: {
  entwurf: string
  endfassung: string
  art: string
  wuensche: string[]
  bezug?: KiBezug | null
}): void {
  void rufeKi('stil_lernen', {
    entwurf: e.entwurf,
    endfassung: e.endfassung,
    art: e.art,
    geaendert: e.entwurf.trim() !== e.endfassung.trim(),
    wuensche: e.wuensche,
    ...(e.bezug ? { tabelle: e.bezug.tabelle, id: e.bezug.id } : {}),
  }).catch(() => undefined)
}

/** Zusammenfassung eines Kunden, Leads, einer Offerte, eines Projekts oder Service-Falls. */
export interface KiZusammenfassungInhalt {
  kurz: string
  punkte: string[]
  offen: string[]
  naechster_schritt: string
}

/** Lead-Bewertung mit Gründen. */
export interface KiLeadBewertungInhalt {
  wahrscheinlichkeit: number
  stufe: 'hoch' | 'mittel' | 'tief'
  sicherheit: 'hoch' | 'mittel' | 'tief'
  gruende: { text: string; richtung: 'plus' | 'minus' }[]
  naechster_schritt: string
}

/** Was die KI auf dem Luftbild sieht (V233 tbAnalyse). */
export interface KiLuftbildInhalt {
  dachform: string
  first_grad: number | null
  flaechen: { ausrichtung: string; azimut: number; eignung: string; anteil: string }[]
  hindernisse: string[]
  verschattung: string | null
  ausrichtung: string
  bemerkung: string | null
  sicherheit: 'hoch' | 'mittel' | 'tief'
}

/** Gespeicherte KI-Ergebnisse je Art. */
export interface KiErgebnisse {
  zusammenfassung: KiZusammenfassungInhalt
  lead_bewertung: KiLeadBewertungInhalt
  luftbild: KiLuftbildInhalt
}

/** Gespeichertes KI-Ergebnis (Zusammenfassung, Lead-Bewertung, Luftbild) zu einem Bezug, das neueste. */
export function useKiErgebnis<A extends keyof KiErgebnisse>(art: A, bezug: KiBezug | null) {
  return useQuery({
    queryKey: ['ki', 'ergebnis', art, bezug?.id],
    enabled: Boolean(supabase && bezug),
    queryFn: async () => {
      if (!supabase || !bezug) return null
      const { data, error } = await supabase
        .from('ki_ergebnisse')
        .select('inhalt, erstellt_am, modell')
        .eq('art', art)
        .eq('bezug_tabelle', bezug.tabelle)
        .eq('bezug_id', bezug.id)
        .is('geloescht_am', null)
        .order('erstellt_am', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as { inhalt: KiErgebnisse[A]; erstellt_am: string; modell: string } | null
    },
  })
}

/**
 * Legt ein frisches Ergebnis direkt in den Zwischenspeicher, statt es nochmals aus der Datenbank zu laden
 * (der Server hat es eben gespeichert; das spart einen Aufruf und zeigt es sofort).
 */
export function kiErgebnisSetzen<A extends keyof KiErgebnisse>(
  qc: QueryClient,
  art: A,
  id: string,
  inhalt: KiErgebnisse[A],
): void {
  qc.setQueryData(['ki', 'ergebnis', art, id], { inhalt, erstellt_am: new Date().toISOString(), modell: '' })
}

/** Was die KI aus einer eingegangenen Mail liest (alles Vorschläge). */
export interface KiMailErkannt {
  typ: 'lead' | 'anliegen' | 'rechnung' | 'werbung' | 'sonstiges'
  sprache: Sprache
  zusammenfassung: string
  kontakt: {
    anrede: 'herr' | 'frau' | null
    vorname: string | null
    nachname: string | null
    firma: string | null
    email: string | null
    telefon: string | null
  }
  adresse: { strasse: string | null; plz: string | null; ort: string | null }
  lead: { interesse: string[]; gebaeudeart: string | null; dachform: string | null; kommentar: string | null }
  anliegen: { thema: string | null; dringend: boolean; antwort_noetig: boolean }
  aufgabe: { titel: string; in_tagen: number } | null
}

/** Passender Kunde aus dem CRM (die Datenbank sucht, nicht die KI). */
export interface KiKandidat {
  kontakt_id: string
  name: string
  kundennummer: number | null
  grund: 'email' | 'telefon' | 'name_plz'
  leads: { id: string; nummer: string; stand: string }[]
  offerten: { id: string; nummer: string; stand: string }[]
  projekte: { id: string; nummer: string; titel: string }[]
  service: { id: string; nummer: string; titel: string }[]
}

export interface KiMailErgebnis {
  erkannt: KiMailErkannt
  kandidaten: KiKandidat[]
  mail: { von: string; betreff: string; text: string; datum: string }
}

/** Aufgabe aus einem KI-Vorschlag anlegen (erst nach Klick; Aufgaben sind intern, nichts geht nach aussen). */
export async function kiAufgabeAnlegen(a: {
  titel: string
  faellig_am: string | null
  person_id: string
  bezug?: KiBezug | null
  text?: string
}): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('aufgaben').insert({
    titel: a.titel,
    text: a.text ?? null,
    faellig_am: a.faellig_am,
    person_id: a.person_id,
    bezug_tabelle: a.bezug?.tabelle ?? null,
    bezug_id: a.bezug?.id ?? null,
  })
  if (error) throw error
}

/** Datei für die KI vorbereiten: Fotos verkleinert (spart Kosten und Zeit), PDF unverändert, als Base64. */
export async function kiDatei(datei: File): Promise<{ typ: string; base64: string }> {
  const blob = datei.type.startsWith('image/') ? await verkleinern(datei, 1600, 0.85) : datei
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { typ: blob.type || datei.type, base64: btoa(s) }
}

/** Was die KI auf einem Spesenbeleg liest. */
export interface KiBeleg {
  datum: string | null
  betrag_rappen: number | null
  waehrung: string | null
  kategorie: string | null
  zweck: string | null
  bemerkung: string | null
}
