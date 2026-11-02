import type { PersonalAkte } from '../types'

/** Ein Feld der Akte im Bearbeiten-Fenster: Art der Eingabe und, bei Listen, welche Auswahlliste. */
export interface AkteFeld {
  k: keyof PersonalAkte
  typ: 'text' | 'datum' | 'zahl' | 'liste' | 'person' | 'lang'
  liste?: string
  breit?: boolean
  platzhalter?: string
}

/** Anstellung: nur Recht «personal» (die Datenbank setzt Änderungen anderer zurück). */
export const ANSTELLUNG: AkteFeld[] = [
  { k: 'vorgesetzt_id', typ: 'person' },
  { k: 'funktion', typ: 'text', platzhalter: 'Projektleiter PV' },
  { k: 'vertragsart', typ: 'liste', liste: 'personal_vertragsart' },
  { k: 'befristet_bis', typ: 'datum' },
  { k: 'eintritt', typ: 'datum' },
  { k: 'probezeit_bis', typ: 'datum' },
  { k: 'pensum', typ: 'zahl', platzhalter: '100' },
  { k: 'wochenstunden', typ: 'zahl', platzhalter: '42.5' },
  { k: 'ferientage', typ: 'zahl', platzhalter: '25' },
  { k: 'kuendigungsfrist_monate', typ: 'zahl', platzhalter: '2' },
  { k: 'vertrag_unterschrieben_am', typ: 'datum' },
  { k: 'austritt', typ: 'datum' },
  { k: 'austrittsgrund', typ: 'text', breit: true },
  { k: 'notiz', typ: 'lang', breit: true },
]

/** Persönliches, Notfallkontakt und Grössen: die Person selbst und Recht «personal». */
export const PERSOENLICH: AkteFeld[] = [
  { k: 'geburtsdatum', typ: 'datum' },
  { k: 'telefon_privat', typ: 'text', platzhalter: '+41 79 …' },
  { k: 'mail_privat', typ: 'text' },
  { k: 'strasse', typ: 'text' },
  { k: 'plz', typ: 'text' },
  { k: 'ort', typ: 'text' },
  { k: 'nationalitaet', typ: 'text' },
  { k: 'zivilstand', typ: 'liste', liste: 'personal_zivilstand' },
  { k: 'bewilligung', typ: 'liste', liste: 'personal_bewilligung' },
  { k: 'bewilligung_bis', typ: 'datum' },
  { k: 'ahv_nr', typ: 'text', platzhalter: '756.1234.5678.97' },
  { k: 'iban', typ: 'text', platzhalter: 'CH93 0076 2011 6238 5295 7' },
  { k: 'notfall_name', typ: 'text' },
  { k: 'notfall_beziehung', typ: 'text' },
  { k: 'notfall_telefon', typ: 'text', platzhalter: '+41 79 …' },
  { k: 'kleidergroesse', typ: 'text', platzhalter: 'L' },
  { k: 'hosengroesse', typ: 'text', platzhalter: '52' },
  { k: 'schuhgroesse', typ: 'text', platzhalter: '43' },
]

/** Werte des Formulars (alles als Text) in Werte für die Datenbank: leer = null, Zahlen als Zahl. */
export function zuWerten(felder: AkteFeld[], w: Record<string, string>): Partial<PersonalAkte> {
  const aus: Record<string, string | number | null> = {}
  for (const f of felder) {
    const v = (w[f.k] ?? '').trim()
    aus[f.k] = v === '' ? null : f.typ === 'zahl' ? Number(v.replace(',', '.')) : v
  }
  return aus
}
