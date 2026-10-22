/** Fachliche Typen des Moduls «Ausgangskorb». */

/** Wo ein Eintrag steht: wartet auf Freigabe, ist freigegeben, wird gerade gesendet, ist raus … */
export type AusgangStatus = 'wartet' | 'freigegeben' | 'wird_gesendet' | 'gesendet' | 'fehler' | 'verworfen'

/** Ein Eintrag im Ausgangskorb (Mail oder SMS). */
export interface AusgangEintrag {
  id: string
  kanal: 'mail' | 'sms' | 'brief'
  art: string
  an: string
  cc: string | null
  betreff: string | null
  text: string | null
  html: string | null
  status: AusgangStatus
  automatisch: boolean
  fehler: string | null
  verworfen_grund: string | null
  anhaenge: { dokument_id: string; name?: string }[]
  erstellt_am: string
  freigegeben_am: string | null
  gesendet_am: string | null
  absender: string | null
  freigegeben_durch: string | null
  kunde: string | null
  kontakt_id: string | null
  verkaufschance_id: string | null
}

/** Filter der Liste. «offen» = wartet, freigegeben, wird gesendet und Fehler. */
export const AUSGANG_FILTER = ['offen', 'gesendet', 'verworfen', 'alle'] as const
export type AusgangFilter = (typeof AUSGANG_FILTER)[number]
