import type { ComponentType } from 'react'
import type { Recht } from './anmeldung'
import type { ModulMeta, Zweisprachig } from './modul'

/** Gruppen der Einstellungs-Seite, in dieser Reihenfolge (Entwurf vom 2.11.2026). */
export type EinstellungsGruppe = 'mich' | 'firma' | 'ablaeufe' | 'system'

/** Was ein Bereich der Einstellungen zum Anzeigen bekommt. */
export interface EinstellungsInhaltProps {
  /** Alle Module, z. B. für die Auswahl sichtbarer Bereiche einer Person. */
  module: readonly ModulMeta[]
}

/**
 * Ein Bereich der Einstellungen. Module melden ihre Bereiche in der eigenen index.ts (`einstellungen`),
 * die Route `src/app/settings.tsx` sammelt sie, damit alles an einem Ort mit Suche steht (Chris: «Alles zentral»).
 */
export interface EinstellungsBereich {
  /** Eindeutig, steht in der Adresse (`#/settings?bereich=…`). */
  id: string
  gruppe: EinstellungsGruppe
  titel: Zweisprachig
  /** Ein Satz, was man hier einstellt. */
  beschreibung: Zweisprachig
  /** Zusätzliche Suchwörter, z. B. «Mahnfrist MWST». */
  stichworte?: Zweisprachig
  /** Name eines lucide-Icons in kebab-case (wie bei den Modulen). */
  icon: string
  /** Wer den Bereich sieht. Was gespeichert werden darf, prüft zusätzlich die Datenbank. */
  recht: Recht
  /** Pfad des Moduls, aus dem der Bereich kommt (Link «Zum Modul»). */
  modulPfad?: string
  Inhalt: ComponentType<EinstellungsInhaltProps>
}
