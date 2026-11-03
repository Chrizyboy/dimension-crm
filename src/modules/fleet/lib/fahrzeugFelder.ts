import { formatChf, parseChf } from '@/lib/format'
import type { Fahrzeug } from '../types'

/** Art eines Formularfelds: bestimmt Eingabe, Anzeige und Umwandlung. */
export type FeldArt = 'text' | 'zahl' | 'chf' | 'datum' | 'auswahl' | 'schalter'

/** Ein Feld im Fahrzeug-Formular. `nurNeu`: nur beim Anlegen (danach setzen es die Einträge). */
export interface FeldDef {
  k: keyof Fahrzeug
  art: FeldArt
  pflicht?: boolean
  nurNeu?: boolean
  nurBearbeiten?: boolean
  breit?: boolean
}

/** Abschnitte des Formulars, damit die vielen Angaben nicht erschlagen. */
export const ABSCHNITTE: { id: string; felder: FeldDef[] }[] = [
  {
    id: 'grund',
    felder: [
      { k: 'bezeichnung', art: 'text', pflicht: true },
      { k: 'kennzeichen', art: 'text', pflicht: true },
      { k: 'art', art: 'auswahl', pflicht: true },
      { k: 'marke_modell', art: 'text' },
      { k: 'jahrgang', art: 'zahl' },
      { k: 'treibstoff', art: 'auswahl' },
      { k: 'standort_id', art: 'auswahl' },
      { k: 'km_stand', art: 'zahl', nurNeu: true },
      { k: 'naechste_mfk', art: 'datum', nurNeu: true },
      { k: 'naechster_service', art: 'datum', nurNeu: true },
      { k: 'naechster_reifenwechsel', art: 'datum', nurNeu: true },
      { k: 'vignette_bis', art: 'datum', nurNeu: true },
    ],
  },
  {
    id: 'technik',
    felder: [
      { k: 'erste_inverkehrsetzung', art: 'datum' },
      { k: 'stammnummer', art: 'text' },
      { k: 'fahrgestell_nr', art: 'text' },
      { k: 'gesamtgewicht_kg', art: 'zahl' },
      { k: 'nutzlast_kg', art: 'zahl' },
      { k: 'anhaengelast_kg', art: 'zahl' },
      { k: 'ausweis', art: 'auswahl' },
      { k: 'tankkarte', art: 'text' },
      { k: 'schluessel', art: 'text' },
      { k: 'reifen', art: 'text', breit: true },
    ],
  },
  {
    id: 'leasing',
    felder: [
      { k: 'leasinggeber', art: 'text' },
      { k: 'leasing_vertrag', art: 'text' },
      { k: 'leasing_beginn', art: 'datum' },
      { k: 'leasing_bis', art: 'datum' },
      { k: 'leasing_rate_rappen', art: 'chf' },
      { k: 'leasing_km_jahr', art: 'zahl' },
      { k: 'leasing_mehr_km_rappen', art: 'chf' },
      { k: 'kaufdatum', art: 'datum' },
      { k: 'kaufpreis_rappen', art: 'chf' },
    ],
  },
  {
    id: 'versicherung',
    felder: [
      { k: 'versicherung', art: 'text' },
      { k: 'versicherung_police', art: 'text' },
      { k: 'versicherung_deckung', art: 'text', breit: true },
      { k: 'selbstbehalt_rappen', art: 'chf' },
      { k: 'schaden_telefon', art: 'text' },
      { k: 'praemie_rappen', art: 'chf' },
      { k: 'verkehrssteuer_rappen', art: 'chf' },
    ],
  },
  {
    id: 'weiteres',
    felder: [
      { k: 'notiz', art: 'text', breit: true },
      { k: 'ausser_betrieb', art: 'schalter', nurBearbeiten: true, breit: true },
    ],
  },
]

export const ALLE_FELDER = ABSCHNITTE.flatMap((a) => a.felder)

/** Formularwerte als Text (Schalter als «ja»/«»), damit alle Eingaben gleich funktionieren. */
export function alsFormular(f: Fahrzeug | null): Record<string, string> {
  const w: Record<string, string> = {}
  for (const d of ALLE_FELDER) {
    const v = f?.[d.k]
    w[d.k] =
      v === null || v === undefined
        ? d.k === 'art'
          ? 'lieferwagen'
          : ''
        : d.art === 'chf'
          ? formatChf(Number(v))
          : d.art === 'schalter'
            ? v
              ? 'ja'
              : ''
            : String(v)
  }
  return w
}

/** Wert eines Felds in den Datenbank-Wert umwandeln; `undefined` heisst ungültig. */
export function wertAus(d: FeldDef, text: string): string | number | boolean | null | undefined {
  const s = text.trim()
  if (d.art === 'schalter') return s === 'ja'
  if (s === '') return d.pflicht ? undefined : null
  if (d.art === 'zahl') {
    const n = Number(s.replace(/['\s]/g, ''))
    return Number.isInteger(n) && n >= 0 ? n : undefined
  }
  if (d.art === 'chf') return parseChf(s) ?? undefined
  if (d.k === 'kennzeichen') return s.toUpperCase()
  return s
}

/**
 * Formular in Datenbank-Werte umwandeln. Gibt die ungültigen Felder zurück; Felder «nur beim Anlegen» kommen
 * beim Ändern nicht mit, weil sie danach die Einträge setzen.
 */
export function ausFormular(
  w: Record<string, string>,
  neu: boolean,
  heute: string,
): { werte: Partial<Fahrzeug>; fehler: string[] } {
  const werte: Record<string, unknown> = {}
  const fehler: string[] = []
  for (const d of ALLE_FELDER) {
    if ((d.nurNeu && !neu) || (d.nurBearbeiten && neu)) continue
    const v = wertAus(d, w[d.k] ?? '')
    if (v === undefined) fehler.push(d.k)
    else werte[d.k] = v
  }
  if (neu) werte.km_stand_am = werte.km_stand === null ? null : heute
  return { werte, fehler }
}
