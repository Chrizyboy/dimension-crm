// Aufgaben der KI, die etwas lesen und Felder vorschlagen: eingehende Mail (Lead oder Anliegen), Gesprächsnotiz,
// Spesenbeleg (V233 spAiRead), Offerten-PDF (V233 oiAi/offAiParse) und Luftbild (V233 tbAnalyse). Die Antworten
// sind Vorschläge; die App zeigt sie zum Prüfen, gespeichert wird erst nach dem Klick eines Menschen.

import type { Teil } from './claude.ts'
import { daten, GRUNDREGELN } from './ki_rahmen.ts'
import { ganz, janein, liste, objekt, oderNull, text, wahl, zahl } from './ki_schema.ts'

/** Systemtext für Leseaufgaben: knapp, keine Stilregeln nötig. */
export const SYSTEM_LESEN = `${GRUNDREGELN}
Du liest Inhalte aus und füllst Felder. Unbekannte Werte sind null (oder eine leere Liste). Rate nie.`

/** Auswahllisten aus der Datenbank, damit die KI nur gültige Schlüssel liefert. */
export interface Auswahlen {
  interesse: string[]
  gebaeudeart: string[]
  dachform: string[]
  aktivitaet: string[]
  kontaktergebnis: string[]
}

/** Eingegangene Mail: Lead, Anliegen eines Kunden oder anderes; Felder für Lead und Kontakt. */
export function mailTeile(m: { von: string; betreff: string; text: string; datum?: string }, heute: string): Teil[] {
  return [
    { art: 'text', text: daten('mail', { von: m.von, betreff: m.betreff, datum: m.datum ?? null, text: m.text.slice(0, 15_000) }) },
    {
      art: 'text',
      text: `Heute ist ${heute}. AUFGABE: Ordne die eingegangene E-Mail ein und lies die Angaben heraus.
«typ»: «lead» = jemand interessiert sich neu für eine Anlage (PV, Speicher, Wallbox, Wärmepumpe); «anliegen» = ein Kunde oder Interessent hat eine Frage, Rückmeldung, Störung oder einen Terminwunsch; «rechnung» = Rechnung oder Zahlung eines Lieferanten; «werbung» = Newsletter, Werbung, automatische Mitteilung; «sonstiges» = alles andere.
Kontakt und Adresse gehören zur Person, die schreibt oder angefragt wird – nie Dimension Solaire selbst (Signatur von Dimension Solaire ignorieren). Telefon im Format wie in der Mail.
«zusammenfassung»: 1–2 Sätze, worum es geht, in der Sprache der Mail.
«aufgabe»: der sinnvolle nächste Schritt für uns (z. B. «Rückruf wegen Offerte») mit Frist in Tagen ab heute; null, wenn nichts zu tun ist.`,
    },
  ]
}

/** Schema der Mail-Erkennung. */
export function mailSchema(a: Auswahlen): Record<string, unknown> {
  return objekt({
    typ: wahl(['lead', 'anliegen', 'rechnung', 'werbung', 'sonstiges']),
    sprache: wahl(['de', 'fr']),
    zusammenfassung: text,
    kontakt: objekt({
      anrede: oderNull(wahl(['herr', 'frau'])),
      vorname: oderNull(text),
      nachname: oderNull(text),
      firma: oderNull(text),
      email: oderNull(text),
      telefon: oderNull(text),
    }),
    adresse: objekt({ strasse: oderNull(text), plz: oderNull(text), ort: oderNull(text) }),
    lead: objekt({
      interesse: liste(wahl(a.interesse)),
      gebaeudeart: oderNull(wahl(a.gebaeudeart)),
      dachform: oderNull(wahl(a.dachform)),
      kommentar: oderNull(text),
    }),
    anliegen: objekt({ thema: oderNull(text), dringend: janein, antwort_noetig: janein }),
    aufgabe: oderNull(objekt({ titel: text, in_tagen: ganz })),
  })
}

/** Gesprächsnotiz (getippt oder diktiert) ordnen: Art, Richtung, Ergebnis, sauberer Text, nächste Aufgabe. */
export function notizTeile(notiz: string, heute: string, kontext: unknown): Teil[] {
  const teile: Teil[] = []
  if (kontext) teile.push({ art: 'text', text: daten('crm', kontext) })
  teile.push({ art: 'text', text: daten('notiz', notiz.slice(0, 8000)) })
  teile.push({
    art: 'text',
    text: `Heute ist ${heute}. AUFGABE: Mache aus der Notiz (oft diktiert, mit Füllwörtern und Tippfehlern) einen sauberen Eintrag für den Verlauf.
«text»: gleiche Fakten, klar und kurz, in ganzen Sätzen, in der Sprache der Notiz; nichts weglassen, was später wichtig sein kann (Zahlen, Wünsche, Bedenken, Zusagen), nichts dazuerfinden.
«art», «richtung» (ein = Kunde hat uns kontaktiert, aus = wir den Kunden), «ergebnis» nur bei Anruf, Besuch oder SMS.
«aufgabe»: nur wenn die Notiz einen nächsten Schritt nennt oder klar nahelegt (z. B. «nächste Woche nochmals anrufen»); «faellig_am» als JJJJ-MM-TT, gerechnet ab heute; sonst null.
«felder»: nur was die Notiz ausdrücklich sagt, sonst null.`,
  })
  return teile
}

/** Schema der Gesprächsnotiz. */
export function notizSchema(a: Auswahlen): Record<string, unknown> {
  return objekt({
    art: wahl(a.aktivitaet),
    richtung: oderNull(wahl(['ein', 'aus'])),
    ergebnis: oderNull(wahl(a.kontaktergebnis)),
    text,
    aufgabe: oderNull(objekt({ titel: text, faellig_am: oderNull(text) })),
    felder: objekt({
      zeithorizont: oderNull(text),
      finanzierung: oderNull(text),
      interesse: liste(wahl(a.interesse)),
      verbrauch_kwh: oderNull(ganz),
    }),
  })
}

/** Spesenbeleg (Bild oder PDF) lesen; Kategorien aus den Finanz-Einstellungen. */
export function belegTeile(datei: Teil, kategorien: { schluessel: string; de: string }[]): Teil[] {
  return [
    datei,
    {
      art: 'text',
      text: `AUFGABE: Das ist ein Beleg oder eine Quittung (Schweiz). Lies ihn aus.
«datum» als JJJJ-MM-TT (Belegdatum). «betrag» = Gesamtbetrag inkl. MWST als Zahl. «waehrung» z. B. CHF oder EUR.
«kategorie»: genau einer dieser Schlüssel: ${kategorien.map((k) => `${k.schluessel} (${k.de})`).join(', ')}.
«zweck»: kurze Beschreibung, z. B. «Tankstelle Coop Pronto Muri» oder «Mittagessen Restaurant Löwen, Bulle» (höchstens 60 Zeichen).
«bemerkung»: z. B. Liter, Kilometer oder Anzahl Personen, falls ersichtlich; sonst null.`,
    },
  ]
}

/** Schema des Belegs. */
export function belegSchema(kategorien: string[]): Record<string, unknown> {
  return objekt({
    datum: oderNull(text),
    betrag: oderNull(zahl),
    waehrung: oderNull(text),
    kategorie: oderNull(wahl(kategorien.length ? kategorien : ['sonstiges'])),
    zweck: oderNull(text),
    bemerkung: oderNull(text),
  })
}

/** Offerten-PDF, das die festen Regeln (Eturnity-Format) nicht lesen konnten. */
export function offertePdfTeile(pdfText: string): Teil[] {
  return [
    { art: 'text', text: daten('offerte', pdfText.slice(0, 14_000)) },
    {
      art: 'text',
      text: `AUFGABE: Aus dieser Photovoltaik- oder Batterie-Offerte die Werte des Hauptsystems (nicht der optionalen Komponenten) lesen.
Kundenangaben stehen meist oben links; die Firma Dimension Solaire ist NICHT der Kunde. «betrag_exkl» = Gesamtbetrag exkl. MWST nach Rabatt als Zahl. «datum» als JJJJ-MM-TT. «wechselrichter» und «batterie»: Hersteller und Typ (bei mehreren «2× …»). Unbekannt = null.`,
    },
  ]
}

/** Schema des Offerten-PDF. */
export const OFFERTE_SCHEMA = objekt({
  nummer: oderNull(text),
  datum: oderNull(text),
  sprache: oderNull(wahl(['de', 'fr'])),
  kunde: objekt({
    vorname: oderNull(text),
    nachname: oderNull(text),
    firma: oderNull(text),
    strasse: oderNull(text),
    plz: oderNull(text),
    ort: oderNull(text),
    telefon: oderNull(text),
    email: oderNull(text),
  }),
  betrag_exkl: oderNull(zahl),
  kwp: oderNull(zahl),
  module: oderNull(ganz),
  wechselrichter: oderNull(text),
  batterie: oderNull(text),
  batterie_kwh: oderNull(zahl),
})

/** Ausrichtungen wie im Formular «Besichtigung». */
export const AUSRICHTUNGEN = ['sued', 'suedost', 'suedwest', 'ost', 'west', 'ost_west', 'nord', 'flach'] as const

/** Luftbild-Analyse (V233 tbAnalyse): Dachform, First, Flächen mit Azimut und Eignung, Hindernisse, Schatten. */
export function luftbildTeile(bild: Teil): Teil[] {
  return [
    bild,
    {
      art: 'text',
      text: `AUFGABE: Du siehst einen Satelliten-Screenshot (meist aus Google Maps). Norden ist oben, sofern keine Kompassdrehung sichtbar ist.
Analysiere das Hauptgebäude – das Gebäude unter der roten Markierung, sonst das Gebäude in der Bildmitte – für die Planung einer Photovoltaikanlage.
Bestimme: die Dachform (Satteldach, Walmdach, Pultdach, Flachdach, Mansarddach, Zeltdach oder andere); den Verlauf des Dachfirsts in Grad (0 = Nord-Süd, 90 = Ost-West; null bei Flachdach); für jede Dachfläche die Himmelsrichtung, in die sie abfällt (z. B. S, SSO, SO …), den Azimut in Grad (0 = Nord, 90 = Ost, 180 = Süd, 270 = West), die Eignung für PV (sehr gut, gut, mässig, ungeeignet) und den ungefähren Anteil an der Dachfläche; sichtbare Hindernisse auf dem Dach (Kamin, Dachfenster, Lukarne, Schneefang, bestehende Solaranlage, Antenne); mögliche Verschattung (Bäume, Nachbargebäude).
«ausrichtung» ist die beste Zusammenfassung für das Formular (ost_west bei zwei gleichwertigen Flächen nach Ost und West, flach bei Flachdach).
Ist etwas nicht sicher erkennbar, schreib das in «bemerkung» und setze «sicherheit» tiefer.`,
    },
  ]
}

/** Schema der Luftbild-Analyse. */
export const LUFTBILD_SCHEMA = objekt({
  dachform: text,
  first_grad: oderNull(ganz),
  flaechen: liste(
    objekt({ ausrichtung: text, azimut: ganz, eignung: wahl(['sehr gut', 'gut', 'mässig', 'ungeeignet']), anteil: text }),
  ),
  hindernisse: liste(text),
  verschattung: oderNull(text),
  ausrichtung: wahl(AUSRICHTUNGEN),
  bemerkung: oderNull(text),
  sicherheit: wahl(['hoch', 'mittel', 'tief']),
})
