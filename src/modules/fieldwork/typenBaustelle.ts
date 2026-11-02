/** Typen für den Ausbau am Handy (Schritte, Team, Seriennummern, Meldungen), Entscheid 0039. */
/** Arbeitsschritt oder Pflichtfoto aus `einstellungen.baustelle` (je Projektart). */
export interface Schritt {
  schluessel: string
  de: string
  fr: string
  /** Gilt nur, wenn ein Speicher dazugehört. */
  speicher?: boolean
}

/** Person im Team eines Einsatzes. */
export interface TeamPerson {
  id: string
  name: string
  kuerzel: string | null
}

/** Zusätze zum Einsatz am Handy (Antwort von `baustellen_infos`). */
export interface BaustellenInfo {
  projekt_id: string
  vorlage: string
  speicher: boolean
  schritte: Schritt[]
  /** Erledigte Schritte mit dem ersten Datum. */
  erledigt: Record<string, string>
  fortschritt: number
  fotos: Schritt[]
  fotos_da: string[]
  soll: number | null
  ist: number | null
  pl: { name: string; telefon: string | null } | null
  team: TeamPerson[]
  meldungen_offen: number
}

/** Gescannte oder getippte Seriennummer im Rapport; geht bei der IBN in die Anlage. */
export interface Seriennummer {
  id: string
  art: string
  modell?: string | null
  seriennummer: string
}

/** Sicherheits-Check vor Arbeitsbeginn. */
export interface Sicherheit {
  am: string
  person_id: string | null
  punkte: Record<string, boolean>
}

export const MELDUNG_ARTEN = ['material', 'schaden', 'kunde', 'wetter', 'planung', 'sicherheit'] as const
export type MeldungArt = (typeof MELDUNG_ARTEN)[number]

/** Meldung, wie der Monteur sie erfasst. */
export interface MeldungEingabe {
  id: string
  art: MeldungArt
  text: string
  weiter: boolean
  rapport_id?: string | null
  projekt_id?: string | null
}

/** Einstellungen der Baustelle (nur Teile, die die App braucht). */
export interface BaustellenEinstellung {
  sicherheit: Schritt[]
  zeiten?: { woche_soll_h?: number; pausen?: { ab_h: number; min: number }[]; max_tag_h?: number; saldo_warnung_h?: number }
}
