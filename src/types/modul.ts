/** Sprachen der Oberfläche. Kundendokumente folgen der Sprache des Kunden. */
export type Sprache = 'de' | 'fr'

/** Text in beiden Sprachen. */
export type Zweisprachig = Record<Sprache, string>

/** Navigations-Gruppen der Seitenleiste (wie in der Vorlage: Übersicht, Verkauf, Abwicklung …). */
export type NavGruppe = 'uebersicht' | 'verkauf' | 'abwicklung' | 'verwaltung' | 'weitere'

/** Kenndaten, die jedes Fachmodul in seiner index.ts exportiert. */
export interface ModulMeta {
  /** Eindeutige, kurze Kennung (= Ordnername), z.B. "sales". */
  id: string
  titel: Zweisprachig
  /** Pfad der Hauptansicht, z.B. "/sales". */
  pfad: string
  /** Name eines lucide-Icons in kebab-case, z.B. "sun". */
  icon: string
  gruppe: NavGruppe
  /** Phase des Bauplans, in der das Modul gebaut wird (0 = gemeinsamer Baustein). */
  phase: Phasennummer
}

/**
 * Nummer einer Bau-Phase. Nachträglich eingeschobene Phasen bekommen einen Buchstaben (z.B. "8b"),
 * damit die freigegebene Nummerierung 0–16 gleich bleibt.
 */
export type Phasennummer = number | `${number}${'a' | 'b' | 'c'}`
