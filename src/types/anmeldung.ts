import type { Sprache, Zweisprachig } from './modul'

/** Rechte, die die Datenbank kennt (RLS). «basis» hat jede aktive Person. */
export type Recht = 'basis' | 'preise' | 'finanzen' | 'admin'

/** Was die Datenbank nach der Anmeldung über die eigene Person liefert (public.meine_anmeldung). */
export interface MeineAnmeldung {
  id: string
  kuerzel: string
  name: string
  email: string | null
  rolle: string
  rolle_name: Zweisprachig
  /** Wirksame Rechte: Rolle plus persönliche Zusatzrechte. */
  rechte: Recht[]
  /** Sichtbare Bereiche (Modul-ids); leer = alle. */
  bereiche: string[]
  /** «einfach»: nur Arbeitszeit und Spesen ohne Seitenleiste (Monteure), aus der Rolle. */
  ansicht?: 'voll' | 'einfach'
  sprache: Sprache
  darstellung: string | null
  standort_id: string | null
  profil: Record<string, unknown>
}

/**
 * Zustand der Anmeldung:
 * - «ohne-datenbank»: Vorschau ohne Supabase, alles sichtbar wie bisher
 * - «kein-zugang»: angemeldet, aber keine aktive Person im CRM (z. B. deaktiviert)
 */
export type Anmeldestatus = 'laden' | 'abgemeldet' | 'angemeldet' | 'kein-zugang' | 'ohne-datenbank'
