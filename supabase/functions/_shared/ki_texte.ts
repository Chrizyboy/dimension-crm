// Aufgaben der KI, die Texte schreiben (V233 aiSend/AI_TYPES, aisLearn, smWrite, nlAi, lbAiText): Kundentexte
// im Firmenstil, Stil lernen, Marketing-Texte, Social-Media-Posts und den Lead-Monatsbericht. Reine Funktionen:
// sie bauen Systemtext, Eingabe und Schema; den Aufruf macht ki_rahmen.

import type { Teil } from './claude.ts'
import { daten, GRUNDREGELN } from './ki_rahmen.ts'
import { liste, objekt, text } from './ki_schema.ts'

type Sprache = 'de' | 'fr'

/** Textarten für Kunden (V233 AI_TYPES.kunde) mit der Aufgabe (V233 AI_TASKS, ergänzt). */
export const KUNDEN_TEXTE: Record<string, string> = {
  offerttext:
    'Schreibe den Text zur Offerte an den Kunden. Aufbau: kurze persönliche Einleitung mit Bezug auf den Besuch vor Ort; Ausgangslage (Gebäude, Dach, Ausrichtung, Verbrauch, Wünsche des Kunden); die vorgeschlagene Lösung (Anlage, Komponenten, Leistung, Speicher, Ladestation – nur was in den Daten und Unterlagen steht); der Nutzen für den Kunden; Ablauf und nächste Schritte (Bewilligung/Meldung, Montage, Inbetriebnahme, Förderung – ohne Beträge oder Termine zu erfinden); Einladung, Fragen zu stellen. Beziehe dich nur auf Fotos und Pläne, die du tatsächlich gesehen hast und die etwas Relevantes zeigen – sonst lass sie weg.',
  antwort:
    'Beantworte die letzte Nachricht des Kunden (siehe «eingang», sonst den Verlauf). Gehe auf jede Frage ein, in der Reihenfolge des Kunden.',
  termin:
    'Schlage einen Termin vor oder bestätige den vereinbarten Termin. Datum und Zeit nur aus den Daten, sonst Platzhalter. Kurz, ohne Zwischenzeilen.',
  offerte: 'Schreibe einen kurzen Begleittext zum Versand der Offerte.',
  nachfassen: 'Schreibe eine freundliche Nachfass-E-Mail zur gesendeten Offerte.',
  auftrag:
    'Bestätige den Auftrag und beschreibe die nächsten Schritte (Bewilligung oder Meldung, Material, Montage, Inbetriebnahme) – ohne Termine oder Beträge zu erfinden.',
  zahlung:
    'Schreibe eine freundliche, klare Zahlungserinnerung zur offenen Rechnung. Nummer, Betrag und Fälligkeit nur aus den Daten.',
  service: 'Antworte zum Service-Fall oder zur Störung: Verständnis zeigen, was wir tun, klarer nächster Schritt.',
  frei: 'Schreibe den Text gemäss den Wünschen.',
}

/** Textarten fürs Marketing (V233 AI_TYPES.marketing; Posts siehe socialAufgabe). */
export const MARKETING_TEXTE: Record<string, string> = {
  mail: 'Serien-E-Mail an viele Empfänger.',
  brief: 'Serienbrief an viele Empfänger (wird gedruckt und per Post verschickt).',
  angebot: 'Aktion oder Angebot an viele Empfänger: klarer Nutzen, nur Fakten aus den Wünschen.',
  newsletter:
    'Newsletter: sachlich, freundlich, konkret, ein klarer Nutzen. Keine Spam-Wörter (gratis, 100 %, garantiert), höchstens ein Ausrufezeichen. Betreff höchstens 60 Zeichen.',
  frei: 'Text gemäss den Wünschen für viele Empfänger.',
}

/** Systemtext für Kundentexte: Grundregeln, Sprache, Schluss, Firmenstil, persönlicher Stil. */
export function systemKundentext(sprache: Sprache, name: string, firmenstil: string, eigenerStil: string): string {
  const gruss = sprache === 'fr' ? 'Meilleures salutations' : 'Freundliche Grüsse'
  return `${GRUNDREGELN}
Du schreibst Texte für ${name || 'eine Mitarbeiterin oder einen Mitarbeiter'}.
Sprache: ${sprache === 'fr' ? 'Französisch (Schweiz), Anrede mit «vous»' : 'Deutsch (Schweiz), Anrede mit «Sie»'}.
Schluss: «${gruss}», dann auf der nächsten Zeile ${name || '[Name]'} und darunter «Dimension Solaire». Keine weiteren Kontaktdaten.
Aufzählungen nur mit «–» und nur für echte Listen. Keine Tabellen, keine Pfeile.

${firmenstil}${eigenerStil}`
}

/** Eingabe für einen Entwurf oder eine Überarbeitung. */
export interface EntwurfEingabe {
  art: string
  sprache: Sprache
  wunsch?: string
  eingang?: string
  bisher?: { betreff: string; text: string } | null
  wuensche?: string[]
  vorlage?: string
}

/** Teile der Anfrage: Daten, Anhänge, dann die Aufgabe (zuletzt, damit sie nach den Daten steht). */
export function entwurfTeile(e: EntwurfEingabe, kontext: unknown, anhaenge: Teil[] = []): Teil[] {
  const aufgabe = KUNDEN_TEXTE[e.art] ?? KUNDEN_TEXTE.frei!
  const teile: Teil[] = []
  if (kontext) teile.push({ art: 'text', text: daten('crm', kontext) })
  if (e.eingang) teile.push({ art: 'text', text: daten('eingang', e.eingang.slice(0, 12_000)) })
  teile.push(...anhaenge)
  let auftrag = `AUFGABE: ${aufgabe}`
  if (e.vorlage) auftrag += `\nDiese Vorlage sagt, was der Text transportieren soll (Inhalt übernehmen, Formulierung im Stil oben):\n${e.vorlage}`
  if (e.bisher) {
    auftrag += `\n\nBISHERIGER ENTWURF:\nBetreff: ${e.bisher.betreff}\n\n${e.bisher.text}`
    if (e.wuensche?.length) auftrag += `\n\nFRÜHERE WÜNSCHE:\n${e.wuensche.map((w) => `– ${w}`).join('\n')}`
    auftrag += `\n\nÄNDERUNGSWUNSCH: ${e.wunsch || 'Verbessere den Entwurf.'}\nGib den vollständigen, überarbeiteten Text zurück.`
  } else if (e.wunsch) {
    auftrag += `\nWünsche: ${e.wunsch}`
  }
  auftrag += '\nIn «hinweise» kurz, was die Person vor dem Senden prüfen sollte (z. B. Platzhalter); sonst leer.'
  teile.push({ art: 'text', text: auftrag })
  return teile
}

/** Antwort eines Entwurfs. */
export const ENTWURF_SCHEMA = objekt({ betreff: text, text, hinweise: liste(text) })

/** Stil lernen (V233 aisLearn): bisherige Regeln mit den Änderungen der Person zusammenführen. */
export function stilLernenTeile(name: string, regeln: string[], entwurf: string, endfassung: string, wuensche: string[]): Teil[] {
  return [
    { art: 'text', text: daten('ki_entwurf', entwurf.slice(0, 5000)) },
    { art: 'text', text: daten('endfassung', endfassung.slice(0, 5000)) },
    ...(wuensche.length ? [{ art: 'text' as const, text: daten('wuensche', wuensche.map((w) => `– ${w}`).join('\n')) }] : []),
    {
      art: 'text',
      text: `Du pflegst eine kurze Liste mit Schreibregeln für ${name || 'eine Person'} (Verkauf, Dimension Solaire, Solaranlagen). Die Liste wird künftigen KI-Entwürfen für Kundentexte mitgegeben, damit sie so klingen, wie diese Person schreibt.

BISHERIGE REGELN:
${regeln.length ? regeln.map((r) => `- ${r}`).join('\n') : '(noch keine)'}

AUFGABE: Leite aus den Änderungen zwischen KI-Entwurf und Endfassung und aus den Wünschen ab, was die Person grundsätzlich anders will (Ton, Länge, Aufbau, Anrede, Wortwahl, typische Sätze, Dinge, die sie weglässt oder immer erwähnt). Nur allgemeine, wiederverwendbare Regeln – nichts, was nur für diesen einen Kunden gilt, keine Namen, Beträge oder Adressen. Führe die bisherigen Regeln mit den neuen Erkenntnissen zusammen: Widersprüche zugunsten der neuen Erkenntnis auflösen, Doppeltes zusammenfassen. Höchstens 15 Regeln, jede ein kurzer Satz auf Deutsch. Wenn nichts Allgemeines erkennbar ist, gib die bisherigen Regeln unverändert zurück.`,
    },
  ]
}

/** Antwort beim Stil lernen. */
export const STIL_SCHEMA = objekt({ regeln: liste(text) })

/** Systemtext für Marketing (V233 aiRules für «marketing» und nlAi). */
export function systemMarketing(firmenstil: string): string {
  return `${GRUNDREGELN}
Du schreibst Marketing-Texte für viele Empfänger. Französisch natürlich und idiomatisch für die Romandie, nicht wörtlich übersetzt.
Platzhalter, die pro Empfänger ersetzt werden: {Anrede} (ganze Anredezeile), {Vorname}, {Nachname}, {Ort}, {Absender}. Keine persönlichen Daten einzelner Kunden.
Stilvorgaben der Firma (für Kundentexte geschrieben; sinngemäss anwenden):
${firmenstil}`
}

/** Eingabe für Serien-Mail, Serienbrief, Aktion oder Newsletter in einer oder beiden Sprachen. */
export interface MarketingEingabe {
  art: string
  sprachen: Sprache[]
  wunsch: string
  bisher?: Partial<Record<Sprache, { betreff: string; text: string }>>
  beispiele?: string[]
}

/** Teile für Marketing-Texte. */
export function marketingTeile(e: MarketingEingabe): Teil[] {
  const teile: Teil[] = []
  if (e.bisher && Object.keys(e.bisher).length) teile.push({ art: 'text', text: daten('bisher', e.bisher) })
  if (e.beispiele?.length) {
    teile.push({
      art: 'text',
      text: `So schreibt unser Team – Stil, Ton und Satzlänge dieser früheren Texte übernehmen (nicht den Inhalt):\n${daten('beispiele', e.beispiele.map((b) => b.slice(0, 1500)).join('\n---\n'))}`,
    })
  }
  teile.push({
    art: 'text',
    text: `AUFGABE: ${MARKETING_TEXTE[e.art] ?? MARKETING_TEXTE.frei!}
Sprachen: ${e.sprachen.map((s) => (s === 'fr' ? 'Französisch' : 'Deutsch')).join(' und ')}.
Thema und Wünsche: ${e.wunsch || '(keine – allgemein bleiben, ohne Zahlen)'}
Beginne den Text mit der Zeile «{Anrede}». Gibt es einen bisherigen Text, übernimm dessen Schluss (z. B. «{Absender}») und überarbeite ihn gemäss den Wünschen. Keine Signatur mit Namen, kein Abmeldetext (wird automatisch angefügt).`,
  })
  return teile
}

/** Schema mit nur den gewählten Sprachen. */
export function marketingSchema(sprachen: Sprache[]): Record<string, unknown> {
  return objekt(Object.fromEntries(sprachen.map((s) => [s, objekt({ betreff: text, text })])))
}

/** Teile für Social-Media-Posts (V233 smWrite): Regeln je Netzwerk aus den Marketing-Vorlagen. */
export function socialTeile(e: {
  thema: string
  netzwerke: string[]
  sprache: string
  regeln: Record<string, string>
  wunsch?: string
  bisher?: unknown
  anlage?: unknown
}): Teil[] {
  const spr =
    e.sprache === 'fr'
      ? 'Französisch (Schweiz)'
      : e.sprache === 'de_fr'
        ? 'zweisprachig: je ein deutscher und ein französischer Text'
        : 'Deutsch (Schweiz)'
  const teile: Teil[] = []
  if (e.anlage) teile.push({ art: 'text', text: daten('referenzanlage', e.anlage) })
  if (e.bisher) teile.push({ art: 'text', text: daten('bisherige_fassung', e.bisher) })
  teile.push({
    art: 'text',
    text: `AUFGABE: Schreibe Social-Media-Posts für Dimension Solaire (Website dimension-solaire.ch). Sprache: ${spr}.
Stil: natürlich, konkret, sympathisch, nicht werberisch übertrieben, keine leeren Floskeln. Nur Fakten aus den Angaben, nichts erfinden (keine Zahlen, Preise oder Förderbeträge, die nicht angegeben sind). Nenne NIE Namen, Adressen oder andere persönliche Daten von Kunden.
Regeln je Netzwerk (Emojis und Hashtags nur, wo die Regel sie erlaubt):
${e.netzwerke.map((n) => `- ${n}: ${e.regeln[n] ?? ''}`).join('\n')}
Thema und Wünsche: ${e.thema}${e.wunsch ? `\nÄnderungswünsche (unbedingt umsetzen): ${e.wunsch}` : ''}${e.bisher ? '\nGibt es eine bisherige Fassung: schreibe eine klar andere Version (anderer Einstieg, anderer Aufhänger), ausser die Wünsche verlangen nur eine Anpassung.' : ''}
In «thema» das Oberthema in 1–2 Wörtern auf Deutsch (z. B. Batteriespeicher, Wärmepumpe, Referenzanlage).`,
  })
  return teile
}

/** Schema für Posts: je Netzwerk die gewählten Sprachen. */
export function socialSchema(netzwerke: string[], sprachen: Sprache[]): Record<string, unknown> {
  const jeSprache = objekt(Object.fromEntries(sprachen.map((s) => [s, text])))
  return objekt({ texte: objekt(Object.fromEntries(netzwerke.map((n) => [n, jeSprache]))), thema: text })
}

/** Systemtext für Mails an Geschäftspartner (z. B. Lead-Anbieter). */
export const SYSTEM_PARTNER = `${GRUNDREGELN}
Du schreibst sachliche E-Mails von Dimension Solaire an Geschäftspartner.`

/** Teile für den Lead-Monatsbericht an den Anbieter (V233 lbAiText). */
export function monatsberichtTeile(e: {
  anbieter: string
  fakten: unknown
  vorlage?: string
  aktuell?: string
  wunsch?: string
}): Teil[] {
  const teile: Teil[] = [{ art: 'text', text: daten('fakten', e.fakten) }]
  if (e.vorlage) teile.push({ art: 'text', text: daten('vorlage_vormonat', e.vorlage) })
  if (e.aktuell && e.wunsch) teile.push({ art: 'text', text: daten('aktueller_entwurf', e.aktuell) })
  teile.push({
    art: 'text',
    text: `AUFGABE: Schreibe die monatliche E-Mail an den Lead-Anbieter «${e.anbieter}». Deutsch (Schweiz), Sie-Form, sachlich, freundlich, klar. Aufzählungen nur mit «–».
Nur die Fakten verwenden, Zahlen exakt übernehmen. Nenne Monat, erhaltene Leads und – falls in den Fakten – gekaufte Leads und die Differenz. Leads unter «reklamation» einzeln auflisten (Datum · Name · PLZ Ort · Grund) und um Prüfung und Gutschrift bitten; ohne solche Leads keine Reklamation formulieren. Leads unter «zur_info» nur kurz zur Information auflisten. Stand der Leads kurz zusammenfassen. Schluss mit «Freundliche Grüsse» ohne Namen.
${e.vorlage ? 'Übernimm Aufbau, Anrede, Tonfall und Formulierungen der Vorlage vom Vormonat möglichst genau, ersetze aber alle Zahlen, Monate und Listen durch die neuen Fakten.' : ''}${e.wunsch ? `\nWunsch: ${e.wunsch}` : ''}
Gib nur den E-Mail-Text zurück (ohne Betreff).`,
  })
  return teile
}

/** Antwort des Monatsberichts. */
export const MONATSBERICHT_SCHEMA = objekt({ text })
