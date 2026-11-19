// Verkaufsblatt zu einem Grossprojekt (Chris, 19.11.2026): «Bei jedem Projekt wissen, warum und wie es angegangen
// werden soll» und «es muss für mich sehr einfach sein, diesen Leuten das zu verkaufen». Die Recherche der KI liefert
// dazu, ob der Eigentümer das Gebäude selbst nutzt (Bedingung von Youdera), Hinweise zur Bonität aus öffentlichen
// Quellen und ein kurzes Gesprächsblatt mit den Zahlen der Youdera-Prüfung. Alles ist ein Vorschlag (Regel 7).

import { erlaubt, janein, kurz, liste, objekt, oderNull, text, wahl } from './ki_schema.ts'

export const BONITAET = ['unauffaellig', 'auffaellig', 'unbekannt'] as const
export const KANAELE = ['telefon', 'besuch', 'mail', 'brief'] as const

/** Zusätzliche Felder der Recherche (im zweiten Aufruf geordnet). */
export const VERKAUF_FELDER = {
  eigentuemer_nutzt_selbst: oderNull(janein),
  bonitaet: wahl(BONITAET),
  bonitaet_hinweis: oderNull(text),
  verkauf: objekt({
    warum: text,
    wer: text,
    kanal: wahl(KANAELE),
    einstieg: text,
    argumente: liste(text),
    einwaende: liste(objekt({ einwand: text, antwort: text })),
  }),
}

/** Gelesenes Verkaufsblatt, wie es in grossprojekte.recherche.verkauf steht. */
export interface Verkauf {
  warum: string
  wer: string
  kanal: (typeof KANAELE)[number]
  einstieg: string
  argumente: string[]
  einwaende: { einwand: string; antwort: string }[]
}

/** Die zusätzlichen Felder prüfen und begrenzen; nichts Unbekanntes geht durch. */
export function verkaufLesen(o: Record<string, unknown>): {
  eigentuemer_nutzt_selbst: boolean | null
  bonitaet: (typeof BONITAET)[number]
  bonitaet_hinweis: string | null
  verkauf: Verkauf | null
} {
  const v = (o.verkauf ?? null) as Record<string, unknown> | null
  const argumente = Array.isArray(v?.argumente) ? (v.argumente as unknown[]) : []
  const einwaende = Array.isArray(v?.einwaende) ? (v.einwaende as Record<string, unknown>[]) : []
  const verkauf: Verkauf | null =
    v && kurz(v.warum, 600)
      ? {
          warum: kurz(v.warum, 600),
          wer: kurz(v.wer, 300),
          kanal: erlaubt(v.kanal, KANAELE) ?? 'telefon',
          einstieg: kurz(v.einstieg, 600),
          argumente: argumente
            .map((a) => kurz(a, 300))
            .filter(Boolean)
            .slice(0, 4),
          einwaende: einwaende
            .map((x) => ({ einwand: kurz(x.einwand, 200), antwort: kurz(x.antwort, 400) }))
            .filter((x) => x.einwand && x.antwort)
            .slice(0, 4),
        }
      : null
  return {
    eigentuemer_nutzt_selbst: typeof o.eigentuemer_nutzt_selbst === 'boolean' ? o.eigentuemer_nutzt_selbst : null,
    bonitaet: erlaubt(o.bonitaet, BONITAET) ?? 'unbekannt',
    bonitaet_hinweis: kurz(o.bonitaet_hinweis, 400) || null,
    verkauf,
  }
}

/** Zusatz zum Auftrag der Websuche: Eigentum, Bonität, Verkaufsblatt. */
export const VERKAUF_AUFTRAG = `4. Nutzt der Eigentümer das Gebäude selbst (eigener Betrieb), oder ist es vermietet? Youdera schliesst nur mit dem Eigentümer ab, und dieser muss mindestens 70 % des Solarstroms selbst brauchen. Bei Vermietung: wer sind die Mieter?
5. Bonität aus öffentlichen Quellen: Konkurs, Nachlassstundung, Liquidation oder Sanierung im Handelsamtsblatt (SHAB) bzw. Handelsregister, auffällige Medienberichte. Betreibungen sind nicht öffentlich: Erfinde nichts, sonst «unbekannt».
6. Ein kurzes Verkaufsblatt, damit der Verkäufer das Gespräch ohne Vorbereitung führen kann. Nutze dafür die Zahlen in <daten name="grossprojekt"> unter «eignung» (empfohlene Anlage kwp_empfohlen, ersparnis_chf pro Jahr, eigenverbrauch_prozent, weg: ppa = der Kunde kauft den Solarstrom vom Dach günstiger als vom Netz, zev = Strom an die Mieter, dachmiete = Dach vermieten). Das Modell: Youdera finanziert, baut mit Dimension Solaire und betreibt die Anlage; der Kunde investiert nichts, zahlt nur den Strom, den er braucht, zu einem festen Preis unter dem Netzpreis, Unterhalt inklusive. Schreibe: warum gerade dieses Gebäude passt (konkret, mit Zahlen), wer anzurufen ist (Funktion, bei KMU Inhaber oder Geschäftsführung), über welchen Kanal, einen ersten Satz für das Telefon, 3 Argumente und 3 typische Einwände mit kurzer Antwort (z. B. Dach alt, lange Vertragsdauer, «kein Interesse», Verkauf des Gebäudes). Nenne nur Zahlen aus den Daten, runde sie und schreibe «rund».`

/** Zusatz zum Auftrag des Ordnens. */
export const VERKAUF_ORDNEN = `eigentuemer_nutzt_selbst: true, wenn der Eigentümer das Gebäude selbst nutzt; false, wenn es vermietet ist; null, wenn unklar. bonitaet: «auffaellig» nur bei Konkurs, Nachlassstundung, Liquidation oder Ähnlichem mit Quelle, sonst «unauffaellig» (geprüft, nichts gefunden) oder «unbekannt»; bonitaet_hinweis ein Satz dazu. verkauf: warum (2–3 Sätze), wer (Funktion und Name, wenn bekannt), kanal, einstieg (erster Satz am Telefon, Du- oder Sie-Form passend zur Firma, sonst Sie), 3 argumente, 3 einwaende mit antwort.`
