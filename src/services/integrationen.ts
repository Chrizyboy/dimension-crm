import { useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { istDesktopApp } from '@/lib/plattform'
import { melde } from './meldungen'
import { supabase } from './supabase'

/**
 * Aufrufe der Server-Funktionen für Microsoft 365, AbaNinja, SMS und den Ausgangskorb (Phase 8).
 * Gemeinsam für alle Module. Die Schlüssel für die fremden Dienste liegen nur auf dem Server;
 * die App schickt nur «was» (Aktion) und bekommt ein Ergebnis oder einen kurzen Fehlercode.
 */

/** Fehler einer Server-Funktion mit kurzem Code (z. B. «nicht_verbunden»). */
export class IntegrationsFehler extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'IntegrationsFehler'
  }
}

/** Text zu einem Fehlercode in der aktuellen Sprache (unbekannte Codes: allgemeiner Text mit Code). */
export function fehlerText(f: unknown): string {
  const code = f instanceof IntegrationsFehler ? f.code : f instanceof Error ? f.message : 'intern'
  const schluessel = `integration.fehler.${code.replace(/\./g, '_')}`
  if (i18n.exists(schluessel)) return i18n.t(schluessel)
  if (/^sms_\d+$/.test(code)) return i18n.t('integration.fehler.sms', { code: code.slice(4) })
  return i18n.t('integration.fehler.unbekannt', { code })
}

/** Zeigt einen Fehler einer Server-Funktion als Meldung in beiden Sprachen. */
export function meldeIntegrationsFehler(f: unknown): void {
  const code = f instanceof IntegrationsFehler ? f.code : 'intern'
  const text = (lng: 'de' | 'fr') => {
    const t = i18n.getFixedT(lng)
    const s = `integration.fehler.${code.replace(/\./g, '_')}`
    return i18n.exists(s) ? t(s) : t('integration.fehler.unbekannt', { code })
  }
  melde('kritisch', { de: text('de'), fr: text('fr') })
}

/** Ruft eine Server-Funktion mit einer Aktion auf. Wirft IntegrationsFehler mit dem Code des Servers. */
export async function rufeFunktion<T extends object>(
  funktion: 'microsoft' | 'abaninja' | 'ausgang' | 'verbindungen' | 'ausschreibungen' | 'social' | 'ki' | 'sicherung',
  aktion: string,
  eingabe: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new IntegrationsFehler('ohne_datenbank')
  const antwort: { data: (T & { ok?: boolean; fehler?: string }) | null; error: unknown } =
    await supabase.functions.invoke<T & { ok?: boolean; fehler?: string }>(funktion, {
      body: { aktion, ...eingabe },
    })
  const { data, error } = antwort
  if (error) {
    // Fehlerantworten (4xx/5xx) enthalten { ok: false, fehler: '<code>' }
    const kontext = (error as { context?: Response }).context
    const inhalt = kontext ? ((await kontext.json().catch(() => null)) as { fehler?: string } | null) : null
    throw new IntegrationsFehler(inhalt?.fehler ?? (kontext ? 'intern' : 'netzwerk'))
  }
  if (!data || data.ok === false) throw new IntegrationsFehler(data?.fehler ?? 'intern')
  return data
}

/** Stand der eigenen Microsoft-Verbindung (ohne Token). */
export interface MicrosoftVerbindung {
  konto: string
  verbunden_am: string
  genutzt_am: string | null
  fehler: string | null
}

/** Eigene Microsoft-Verbindung (null = nicht verbunden). */
export function useMeineMicrosoftVerbindung() {
  return useQuery({
    queryKey: ['microsoft', 'meine'],
    enabled: Boolean(supabase),
    queryFn: async () => {
      if (!supabase) return null
      const { data, error } = await supabase.rpc('meine_microsoft_verbindung')
      if (error) throw error
      return (data as MicrosoftVerbindung | null) ?? null
    },
  })
}

/** Nach Verbinden/Trennen: Anzeige neu laden. */
export function useMicrosoftNeuLaden() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['microsoft'] })
}

/**
 * Startet «Mit Microsoft verbinden»: holt die Anmelde-Adresse und öffnet sie. Im Web im selben Fenster
 * (Microsoft leitet danach zurück zu «Mein Konto»), in der Desktop-App in einem eigenen Fenster, damit
 * die App selbst offen bleibt.
 */
export async function mitMicrosoftVerbinden(sprache: 'de' | 'fr'): Promise<void> {
  const { adresse } = await rufeFunktion<{ adresse: string }>('microsoft', 'verbinden', { sprache })
  if (istDesktopApp() && window.open(adresse, '_blank', 'noopener')) return
  window.location.assign(adresse)
}

/** Ergebnis beim Abholen der Anfragen aus dem Postfach. */
export interface AnfragenErgebnis {
  neu: number
  ergaenzt: number
  geloescht: number
  /** Schon übernommen oder nicht als Anfrage erkannt. */
  uebersprungen: number
  postfach_anfragen: 'ok' | 'kein_zugriff' | 'aus'
}

/** Microsoft-Aktionen für die Module. */
export const microsoft = {
  trennen: () => rufeFunktion('microsoft', 'trennen'),
  testen: () => rufeFunktion<{ konto: string }>('microsoft', 'testen'),
  kalenderLaden: (tage?: number) =>
    rufeFunktion<{ anzahl: number }>('microsoft', 'kalender_laden', tage ? { tage } : {}),
  mailsAbgleichen: () => rufeFunktion<{ anzahl: number }>('microsoft', 'mails_abgleichen'),
  anfragenAbholen: () => rufeFunktion<AnfragenErgebnis>('microsoft', 'anfragen_abholen'),
  /** Eine Anfrage aus einer .eml-Datei übernehmen (braucht keine Microsoft-Verbindung). */
  mailEinlesen: (eml: string) => rufeFunktion<AnfragenErgebnis>('microsoft', 'mail_einlesen', { eml }),
  terminEintragen: (e: { verkaufschance_id: string; betreff?: string; text?: string; kunde_einladen: boolean }) =>
    rufeFunktion<{ outlook: Record<string, unknown> }>('microsoft', 'termin_eintragen', e),
  terminAbsagen: (verkaufschance_id: string) => rufeFunktion('microsoft', 'termin_absagen', { verkaufschance_id }),
  sharepointSichern: (dokument_ids?: string[]) =>
    rufeFunktion<{ gesichert: number; fehler: number }>(
      'microsoft',
      'sharepoint_sichern',
      dokument_ids ? { dokument_ids } : {},
    ),
}

/** Kunde in AbaNinja (wie die Server-Funktion ihn liefert). */
export interface AbaKunde {
  uuid: string
  art: 'person' | 'company'
  name: string
  kundennummer: string
  email: string
  ort: string
}

/** Rechnung aus AbaNinja (Beträge in Rappen). */
export interface AbaRechnung {
  uuid: string
  nummer: string
  datum: string
  faellig: string
  total_rappen: number
  offen_rappen: number
  status: string
}

/** AbaNinja-Aktionen (Kundenakte). */
export const abaninja = {
  suchen: (begriff: string) => rufeFunktion<{ kunden: AbaKunde[] }>('abaninja', 'suchen', { begriff }),
  kunde: (kontakt_id: string) => rufeFunktion<{ kunde: AbaKunde | null }>('abaninja', 'kunde', { kontakt_id }),
  verknuepfen: (kontakt_id: string, uuid: string) =>
    rufeFunktion<{ kunde: AbaKunde }>('abaninja', 'verknuepfen', { kontakt_id, uuid }),
  anlegen: (kontakt_id: string) => rufeFunktion<{ uuid: string }>('abaninja', 'anlegen', { kontakt_id }),
  aktualisieren: (kontakt_id: string) => rufeFunktion('abaninja', 'aktualisieren', { kontakt_id }),
  trennen: (kontakt_id: string) => rufeFunktion('abaninja', 'trennen', { kontakt_id }),
  rechnungen: (kontakt_id: string) =>
    rufeFunktion<{ rechnungen: AbaRechnung[] }>('abaninja', 'rechnungen', { kontakt_id }),
  /** Gestellte Rechnung als Entwurf an AbaNinja (QR-Rechnung und Versand dort). */
  rechnungUebergeben: (rechnung_id: string) =>
    rufeFunktion<{ uuid: string | null }>('abaninja', 'rechnung_uebergeben', { rechnung_id }),
  /** Rechnungen und Lieferantenrechnungen aus AbaNinja lesen (anwenden mit abaninja_abgleich_anwenden). */
  abgleich: (seit?: string) =>
    rufeFunktion<{ rechnungen: unknown[]; belege: unknown[] }>('abaninja', 'abgleich', seit ? { seit } : {}),
}

/** Welche Dienste auf dem Server eingerichtet sind (nur ja/nein). */
export interface VerbindungsStatus {
  eingerichtet: {
    microsoft: boolean
    abaninja: boolean
    sms: boolean
    zeitplan: boolean
    ki?: boolean
    app_url?: boolean
  }
  rueckruf: string
}

/** Status der Dienste (nur mit Datenbank; ohne Server-Funktionen: alles «nicht eingerichtet»). */
export function useVerbindungsStatus() {
  return useQuery({
    queryKey: ['verbindungen', 'status'],
    enabled: Boolean(supabase),
    retry: false,
    queryFn: () => rufeFunktion<VerbindungsStatus>('verbindungen', 'status'),
  })
}

/** Einen Dienst mit echtem Aufruf prüfen (nur Admins). */
export const verbindungTesten = (dienst: 'microsoft' | 'abaninja' | 'sms') =>
  rufeFunktion<{ meldung: string }>('verbindungen', 'testen', { dienst })

/** Freigegebene Einträge im Ausgangskorb jetzt senden (sonst sendet der Zeitplan innert einer Minute). */
export const ausgangJetztSenden = () => rufeFunktion<{ gesendet: number; fehler: number }>('ausgang', 'senden')
