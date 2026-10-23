/** Eine Aufgabe: von Hand, aus einer Automation (lauf_id) oder aus dem Ausschreibungs-Monitor. */
export interface Aufgabe {
  id: string
  titel: string
  text: string | null
  faellig_am: string | null
  person_id: string | null
  bezug_tabelle: string | null
  bezug_id: string | null
  lauf_id: string | null
  erledigt_am: string | null
  erstellt_am: string
}

/** Person für «Wer?». */
export interface Person {
  id: string
  kuerzel: string
  name: string
}

/** «meine» oder «alle»; «offen» oder «erledigt». */
export interface AufgabenFilter {
  wer: 'meine' | 'alle'
  stand: 'offen' | 'erledigt'
}
