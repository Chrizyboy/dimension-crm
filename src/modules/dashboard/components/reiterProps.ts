import type { MeineAnmeldung } from '@/types/anmeldung'
import type { Bereich, Detail, Fakt, KennzahlenEinstellungen, Zeitraum } from '../types'

/** Was jeder Reiter bekommt: Zeilen (schon nach Firma und Person gefiltert), Vergleich, Einstellungen. */
export interface ReiterProps {
  fakten: Fakt[]
  /** Zeilen nur nach Firma gefiltert (für Ranglisten über alle Personen). */
  alleFakten: Fakt[]
  /** Zeilen des Vergleichszeitraums (null bei «Alles»). */
  vorher: Fakt[] | null
  /** «Vorjahr» oder «Vorperiode», für die Beschriftung. */
  vergleichName: string
  /** Vergleichszeitraum oder null. */
  vergleich: { von: string; bis: string } | null
  zeitraum: Zeitraum
  von: string
  bis: string
  heute: string
  bereich: Bereich
  /** Gewählte Person (Filter) oder null für alle. */
  person: string | null
  e: KennzahlenEinstellungen
  personen: { id: string; name: string; kuerzel: string }[]
  ich: MeineAnmeldung | null
  finanzen: boolean
  onDetail: (d: Detail) => void
  /** Gleicher Filter (Firma, Person) für zusätzlich geladene Zeilen, z. B. «Woche in Zahlen». */
  filtern: (f: Fakt[]) => Fakt[]
}
