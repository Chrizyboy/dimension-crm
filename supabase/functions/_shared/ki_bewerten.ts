// Aufgaben der KI, die zusammenfassen und einschätzen: Kunden-/Projekt-Zusammenfassung auf Knopfdruck,
// Lead-Bewertung (Abschlusswahrscheinlichkeit mit Begründung) und das Tagesbriefing pro Person.

import type { Teil } from './claude.ts'
import { daten, GRUNDREGELN } from './ki_rahmen.ts'
import { ganz, liste, objekt, oderNull, text, wahl } from './ki_schema.ts'

type Sprache = 'de' | 'fr'
const SPRACHE = (s: Sprache) => (s === 'fr' ? 'Französisch (Schweiz)' : 'Deutsch (Schweiz)')

/** Systemtext für Einschätzungen: nüchtern, intern, kurz. */
export function systemIntern(sprache: Sprache): string {
  return `${GRUNDREGELN}
Du schreibst für das Team intern (nicht für Kunden): nüchtern, kurz, konkret, in ${SPRACHE(sprache)}. Interne Notizen darfst du hier verwenden.`
}

/** Zusammenfassung eines Kunden, Leads, Projekts, einer Offerte oder eines Service-Falls. */
export function zusammenfassungTeile(kontext: unknown): Teil[] {
  return [
    { art: 'text', text: daten('crm', kontext) },
    {
      art: 'text',
      text: `AUFGABE: Fasse den Stand zusammen, damit jemand ohne Vorwissen in 30 Sekunden weiss, worum es geht. Der Bezug («bezug») und Einträge mit «hauptsache: true» stehen im Mittelpunkt.
«kurz»: 2–3 Sätze. «punkte»: höchstens 6 wichtige Fakten (mit Datum oder Betrag, wo vorhanden). «offen»: offene Fragen, Risiken oder Versprechen, höchstens 4. «naechster_schritt»: ein konkreter Vorschlag.`,
    },
  ]
}

/** Schema der Zusammenfassung. */
export const ZUSAMMENFASSUNG_SCHEMA = objekt({
  kurz: text,
  punkte: liste(text),
  offen: liste(text),
  naechster_schritt: text,
})

/** Lead-Bewertung mit Erfahrungswerten aus der eigenen Datenbank. */
export function leadBewertungTeile(kontext: unknown, statistik: unknown, heute: string): Teil[] {
  return [
    { art: 'text', text: daten('crm', kontext) },
    { art: 'text', text: daten('erfahrungswerte', statistik) },
    {
      art: 'text',
      text: `Heute ist ${heute}. AUFGABE: Schätze ein, wie wahrscheinlich der Lead mit «hauptsache: true» zu einem Auftrag wird (0–100 %).
Stütze dich auf die Erfahrungswerte (Anteil der Leads derselben Quelle und desselben Standorts, die zum Auftrag wurden) und passe sie mit den Angaben zum Lead an: Stand, Alter, Kontakte und Erreichbarkeit, Termin oder Besichtigung, Offerte, Zeithorizont, Finanzierung, Interesse, Eigentum, Kommentar des Kunden. Sei ehrlich: wenig Angaben heisst eher nahe am Erfahrungswert und tiefe «sicherheit».
«gruende»: 3–5 kurze Gründe, je mit «plus» oder «minus». «naechster_schritt»: was die Chance am meisten erhöht.`,
    },
  ]
}

/** Schema der Lead-Bewertung. */
export const LEAD_SCHEMA = objekt({
  wahrscheinlichkeit: ganz,
  stufe: wahl(['hoch', 'mittel', 'tief']),
  sicherheit: wahl(['hoch', 'mittel', 'tief']),
  gruende: liste(objekt({ text, richtung: wahl(['plus', 'minus']) })),
  naechster_schritt: text,
})

/** Tagesbriefing: was heute zählt, mit Verweisen auf die Einträge der Daten («ref»). */
export function briefingTeile(d: unknown): Teil[] {
  return [
    { art: 'text', text: daten('mein_tag', d) },
    {
      art: 'text',
      text: `AUFGABE: Schreibe das Tagesbriefing für die Person in «person». «gruss»: ein kurzer, natürlicher Satz zum Tag (ohne Floskeln, ohne Wetter). «einleitung»: 1–2 Sätze, was heute ansteht (Anzahl Termine, Fälliges).
«prioritaeten»: höchstens 5 Dinge in sinnvoller Reihenfolge (feste Termine zuerst, dann Überfälliges, dann Chancen wie neue Leads oder Offerten zum Nachfassen). Je ein kurzer «titel», «warum» in einem Satz und «ref» genau wie in den Daten (z. B. «lead:…»), oder null.
«hinweis»: eine Sache, die leicht vergessen geht (z. B. Entwürfe im Ausgangskorb), oder null. Nur was in den Daten steht.`,
    },
  ]
}

/** Schema des Tagesbriefings. */
export const BRIEFING_SCHEMA = objekt({
  gruss: text,
  einleitung: text,
  prioritaeten: liste(objekt({ titel: text, warum: text, ref: oderNull(text) })),
  hinweis: oderNull(text),
})

/** Alle «ref» in den Briefing-Daten, damit nur echte Verweise in die App gelangen. */
export function refsIn(d: unknown): Set<string> {
  const s = new Set<string>()
  const geh = (w: unknown) => {
    if (Array.isArray(w)) w.forEach(geh)
    else if (w && typeof w === 'object') {
      for (const [k, v] of Object.entries(w)) {
        if (k === 'ref' && typeof v === 'string') s.add(v)
        else geh(v)
      }
    }
  }
  geh(d)
  return s
}
