// Aktion «auftragsbestaetigung» der Edge Function «ki» (Entscheid 0041): liest die Auftragsbestätigung eines
// Lieferanten (Mailtext oder PDF) und ordnet sie den Positionen der Bestellung zu. Nur ein Vorschlag: die App
// zeigt Abweichungen zum Prüfen, gespeichert wird erst mit «Übernehmen» (bestellung_ab_erfassen).

import type { Ich } from '../_shared/datenbank.ts'
import { DienstFehler } from '../_shared/http.ts'
import { daten, kiAufruf, kiEinstellung, GRUNDREGELN } from '../_shared/ki_rahmen.ts'
import { ganz, liste, objekt, oderNull, text, zahl } from '../_shared/ki_schema.ts'
import { dateiFeld, frei, heute } from './hilfe.ts'

type Eingabe = Record<string, unknown>

interface Pos {
  nr: number
  bezeichnung: string
  artikelnummer: string | null
  menge: number
  ek_rappen: number | null
}

/** Positionen der Bestellung aus der Eingabe (höchstens 200, nur die nötigen Felder). */
function positionenFeld(e: Eingabe): Pos[] {
  if (!Array.isArray(e.positionen)) throw new DienstFehler('eingabe', 400, 'positionen')
  return e.positionen.slice(0, 200).map((p: Record<string, unknown>, i) => ({
    nr: i + 1,
    bezeichnung: String(p.bezeichnung ?? '').slice(0, 300),
    artikelnummer: typeof p.artikelnummer === 'string' ? p.artikelnummer.slice(0, 80) : null,
    menge: Number(p.menge) || 0,
    ek_rappen: typeof p.ek_rappen === 'number' ? p.ek_rappen : null,
  }))
}

const SCHEMA = objekt({
  nummer: oderNull(text),
  datum: oderNull(text),
  termin: oderNull(text),
  total_rappen: oderNull(ganz),
  positionen: liste(objekt({ nr: ganz, menge: oderNull(zahl), ek_rappen: oderNull(ganz) })),
  hinweis: oderNull(text),
})

/** Auftragsbestätigung lesen: Nummer, Datum, Liefertermin, Total und je Position bestätigte Menge und Preis. */
export async function auftragsbestaetigung(e: Eingabe, ich: Ich) {
  const positionen = positionenFeld(e)
  const mailText = frei(e, 'text', 20_000)
  const datei = e.datei ? dateiFeld(e) : null
  if (!datei && !mailText.trim()) throw new DienstFehler('eingabe', 400, 'text')
  const cfg = await kiEinstellung()
  const r = await kiAufruf({ funktion: 'auftragsbestaetigung', personId: ich.id }, cfg, {
    system: `${GRUNDREGELN}\nDu liest Inhalte aus und füllst Felder. Unbekannte Werte sind null. Rate nie.`,
    teile: [
      ...(datei ? [datei] : []),
      ...(mailText ? [{ art: 'text' as const, text: daten('mail', mailText) }] : []),
      { art: 'text', text: daten('bestellung', positionen) },
      {
        art: 'text',
        text: `Heute ist ${heute()}. AUFGABE: Das ist die Auftragsbestätigung (AB) eines Lieferanten zu unserer Bestellung.
«nummer»: Nummer der AB (nicht unsere Bestellnummer). «datum»: Datum der AB, «termin»: bestätigter Liefertermin, beide als JJJJ-MM-TT.
«total_rappen»: Total exkl. MWST in Rappen (CHF 1'234.50 = 123450).
«positionen»: für jede Position der Bestellung («nr»), die in der AB vorkommt, die bestätigte Menge und den Einzelpreis exkl. MWST in Rappen nach Rabatt. Zuordnen über Artikelnummer, sonst Bezeichnung. Nicht gefundene Positionen weglassen.
«hinweis»: kurz, was auffällt (Teillieferung, Ersatzartikel, Fracht), sonst null.`,
      },
    ],
    schema: SCHEMA,
    maxTokens: 3000,
  })
  const j = r.json as {
    nummer: string | null
    datum: string | null
    termin: string | null
    total_rappen: number | null
    positionen: { nr: number; menge: number | null; ek_rappen: number | null }[]
    hinweis: string | null
  }
  const datumOk = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null)
  return {
    nummer: j.nummer?.slice(0, 80) ?? null,
    datum: datumOk(j.datum),
    termin: datumOk(j.termin),
    total_rappen: j.total_rappen,
    hinweis: j.hinweis?.slice(0, 500) ?? null,
    positionen: (j.positionen ?? []).filter((p) => p.nr >= 1 && p.nr <= positionen.length),
  }
}
