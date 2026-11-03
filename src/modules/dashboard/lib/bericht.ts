import type { Fakt, KennzahlenEinstellungen } from '../types'
import { quote, summe } from './auswertung'
import { reaktionQuote, ueberfaellig } from './betrieb'
import { franken, tageText, zahl } from './format'
import { kwpSumme, mittelTage, pipelineNachStand, von } from './verkauf'
import { erreicht, zielFuer } from './ziele'

/** Eine Zeile des Monatsberichts: Kennzahl, Monat, gleicher Monat im Vorjahr, Ziel (Text). */
export interface BerichtZeile {
  id: string
  wert: string
  vorjahr: string
  ziel: string
}

/** Erster und letzter Tag eines Monats «JJJJ-MM». */
export function monatsGrenzen(monat: string): { von: string; bis: string } {
  const [j, m] = monat.split('-').map(Number) as [number, number]
  const ende = new Date(Date.UTC(j, m, 0)).toISOString().slice(0, 10)
  return { von: `${monat}-01`, bis: ende }
}

/** Vormonat eines Datums als «JJJJ-MM». */
export function vormonat(heute: string): string {
  const [j, m] = heute.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(j, m - 2, 1)).toISOString().slice(0, 7)
}

/**
 * Zahlen des Monatsberichts (K4 A) aus denselben Zeilen wie die Seite: Verkauf, Abwicklung, Finanzen (nur mit
 * Recht), Service. Ziel anteilig für den Monat. Gibt die Zeilen in fester Reihenfolge zurück.
 */
export function berichtZeilen(
  jetzt: readonly Fakt[],
  vorjahr: readonly Fakt[],
  e: KennzahlenEinstellungen,
  monat: string,
  heute: string,
  finanzen: boolean,
): BerichtZeile[] {
  const { von: start, bis: ende } = monatsGrenzen(monat)
  const auftrag = (f: readonly Fakt[]) => summe(von(f, 'angenommen'))
  const q = (f: readonly Fakt[]) => quote([...von(f, 'angenommen'), ...von(f, 'verloren')])
  const prozent = (n: number | null) => (n === null ? '–' : `${String(n)} %`)
  const ziel = zielFuer(e, { art: 'bereich', bereich: 'alle' }, start, ende)
  const zielUmsatz = zielFuer(e, { art: 'umsatz' }, start, ende)
  const beide = (id: string, f: (x: readonly Fakt[]) => string, z = '–'): BerichtZeile => ({
    id,
    wert: f(jetzt),
    vorjahr: f(vorjahr),
    ziel: z,
  })
  const zeilen: BerichtZeile[] = [
    beide('leads', (f) => String(von(f, 'leads_neu').length)),
    beide('termine', (f) => String(von(f, 'termine').length)),
    beide('gesendet', (f) => `${String(von(f, 'gesendet').length)} · ${franken(summe(von(f, 'gesendet')))}`),
    beide(
      'auftraege',
      (f) => `${String(von(f, 'angenommen').length)} · ${franken(auftrag(f))}`,
      ziel === null ? '–' : `${franken(ziel)} (${prozent(erreicht(auftrag(jetzt), ziel))})`,
    ),
    beide('kwp', (f) => `${zahl(kwpSumme(von(f, 'auftrag')), 1)} kWp`),
    beide('quote', (f) => prozent(q(f))),
    beide('ibn', (f) => `${String(von(f, 'ibn').length)} · ${zahl(kwpSumme(von(f, 'ibn')), 1)} kWp`),
    beide(
      'ibnTage',
      (f) => `${tageText(mittelTage(von(f, 'ibn')))} T`,
      `≤ ${String(e.richtwerte.unterschrift_ibn_tage)} T`,
    ),
    {
      id: 'pipeline',
      wert: franken(pipelineNachStand(von(jetzt, 'offen'), e, heute).reduce((s, z) => s + z.gewichtet, 0)),
      vorjahr: '–',
      ziel: '–',
    },
    beide('faelle', (f) => String(von(f, 'faelle_neu').length)),
    beide(
      'reaktion',
      (f) => prozent(reaktionQuote(von(f, 'fall_neu')).prozent),
      `≥ ${String(e.richtwerte.reaktion_prozent)} %`,
    ),
  ]
  if (finanzen) {
    zeilen.splice(
      8,
      0,
      beide(
        'umsatz',
        (f) => franken(summe(von(f, 'umsatz'))),
        zielUmsatz === null
          ? '–'
          : `${franken(zielUmsatz)} (${prozent(erreicht(summe(von(jetzt, 'umsatz')), zielUmsatz))})`,
      ),
      beide('eingang', (f) => franken(summe(von(f, 'bezahlt')))),
      { id: 'ueberfaellig', wert: franken(summe(ueberfaellig(von(jetzt, 'rechnung_offen')))), vorjahr: '–', ziel: '–' },
    )
  }
  return zeilen
}
