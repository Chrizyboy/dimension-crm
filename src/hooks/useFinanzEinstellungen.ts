import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'

/** Spesen-Kategorie mit Text in beiden Sprachen; gespeichert wird der Schlüssel. */
export interface SpesenKategorie {
  schluessel: string
  de: string
  fr: string
  /** «kilometer»: Privatauto, Betrag = km × Ansatz, ohne Beleg. */
  art?: 'beleg' | 'kilometer'
  /** Konto im Kontenplan (KMU), für CSV und Abrechnung. */
  konto?: string | null
  /** Übliche MWST in Prozent (Vorschlag beim Erfassen). */
  mwst_satz?: number | null
  /** Richtwert in Rappen, je Person oder je Beleg; darüber gibt es einen Hinweis bei der Prüfung. */
  richtwert_rappen?: number | null
  richtwert_je?: 'person' | 'beleg' | null
  /** Ab diesem Betrag braucht es einen Beleg (0 = immer). */
  beleg_ab_rappen?: number | null
}

/** Regeln der Spesen: Kilometer-Ansatz, Frist zum Einreichen, Standard der Auszahlung. */
export interface SpesenRegeln {
  km_satz_rappen: number
  einreichen_tage: number
  auszahlung: 'lohn' | 'ueberweisung'
}

/** Einstellung «finanzen» (Daten, nicht Code; ändern nur mit Recht «finanzen»). */
export interface FinanzEinstellungen {
  service_stundensatz_rappen: number
  intern_stundensatz_rappen: number
  mahnfrist_tage: number
  buchhaltung_email: string | null
  spesen_kategorien: SpesenKategorie[]
  spesen: SpesenRegeln
  /** Eingangsrechnungen: ab diesem Betrag braucht es das Zweitvisum der Geschäftsleitung. */
  eingang?: { visum_gl_ab_rappen?: number }
}

const STANDARD: FinanzEinstellungen = {
  service_stundensatz_rappen: 12000,
  intern_stundensatz_rappen: 6500,
  mahnfrist_tage: 10,
  buchhaltung_email: null,
  spesen_kategorien: [],
  spesen: { km_satz_rappen: 70, einreichen_tage: 60, auszahlung: 'lohn' },
}

/**
 * Einstellungen der Finanzen, gemeinsam für Rechnungen (Mahnfrist, Stundensatz), Spesen (Kategorien,
 * Mail an die Buchhaltung) und Finanzen (interner Stundensatz der Nachkalkulation).
 */
export function useFinanzEinstellungen(): FinanzEinstellungen {
  const abfrage = useQuery({
    queryKey: ['einstellungen', 'finanzen'],
    staleTime: 10 * 60_000,
    enabled: supabase !== null,
    queryFn: async () => {
      if (!supabase) return STANDARD
      const { data, error } = await supabase
        .from('einstellungen')
        .select('wert')
        .eq('schluessel', 'finanzen')
        .maybeSingle()
      if (error) throw error
      const wert = (data?.wert ?? {}) as Partial<FinanzEinstellungen>
      return { ...STANDARD, ...wert, spesen: { ...STANDARD.spesen, ...(wert.spesen ?? {}) } }
    },
  })
  return abfrage.data ?? STANDARD
}

/** Einstellungen der Finanzen speichern (die Datenbank prüft das Recht). */
export async function finanzEinstellungenSpeichern(wert: FinanzEinstellungen): Promise<void> {
  if (!supabase) throw new Error('Keine Datenbank verbunden')
  const { error } = await supabase
    .from('einstellungen')
    .update({ wert: wert as never })
    .eq('schluessel', 'finanzen')
  if (error) throw error
}
