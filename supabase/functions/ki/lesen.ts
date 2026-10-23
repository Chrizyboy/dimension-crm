// Aktionen der Edge Function «ki», die etwas lesen: eingegangene Mail (Lead oder Anliegen, mit Zuordnung),
// Gesprächsnotiz, Spesenbeleg, Offerten-PDF und Luftbild. Alles sind Vorschläge zum Prüfen.

import { emlLesen, entitaeten } from '../_shared/anfrage.ts'
import { alsPerson, dienst, type Ich } from '../_shared/datenbank.ts'
import { DienstFehler } from '../_shared/http.ts'
import * as L from '../_shared/ki_lesen.ts'
import { kiAufruf, kiEinstellung } from '../_shared/ki_rahmen.ts'
import { erlaubt, kurz } from '../_shared/ki_schema.ts'
import {
  auswahlen,
  bezugFeld,
  dateiFeld,
  dokumentTeil,
  frei,
  heute,
  idFeld,
  speichereErgebnis,
  spracheFeld,
} from './hilfe.ts'

type Eingabe = Record<string, unknown>

interface MailErgebnis {
  typ: string
  sprache: 'de' | 'fr'
  zusammenfassung: string
  kontakt: Record<string, string | null>
  adresse: Record<string, string | null>
  lead: { interesse: string[]; gebaeudeart: string | null; dachform: string | null; kommentar: string | null }
  anliegen: { thema: string | null; dringend: boolean; antwort_noetig: boolean }
  aufgabe: { titel: string; in_tagen: number } | null
}

/**
 * Eingegangene Mail einordnen (Bau-Auftrag 3.4): Lead oder Anliegen, Felder herauslesen, passende Kunden vorschlagen.
 * Text oder .eml; die Zuordnung macht die Datenbank (nachvollziehbar), die KI liest nur die Felder.
 */
export async function mailErkennen(e: Eingabe, ich: Ich) {
  let m = {
    von: frei(e, 'von', 300),
    betreff: frei(e, 'betreff', 500),
    text: frei(e, 'text', 20_000),
    datum: frei(e, 'datum', 40),
  }
  if (typeof e.eml === 'string') {
    if (e.eml.length > 5_000_000) throw new DienstFehler('datei_zu_gross', 413, 'eml')
    const x = emlLesen(e.eml)
    m = {
      von: x.von,
      betreff: x.betreff,
      text: entitaeten(x.inhalt.replace(/<[^>]+>/g, ' '))
        .replace(/\s+\n/g, '\n')
        .slice(0, 20_000),
      datum: x.datum,
    }
  }
  if (!m.text.trim() && !m.betreff.trim()) throw new DienstFehler('eingabe', 400, 'text')
  const a = await auswahlen()
  const cfg = await kiEinstellung()
  const r = await kiAufruf({ funktion: 'mail_erkennen', personId: ich.id }, cfg, {
    system: L.SYSTEM_LESEN,
    teile: L.mailTeile(m, heute()),
    schema: L.mailSchema(a),
    maxTokens: 3000,
  })
  const j = r.json as MailErgebnis
  const k = j.kontakt ?? {}
  const kandidaten = await alsPerson(ich).rpc<unknown[]>('ki_zuordnung', {
    p_email: k.email ?? /<([^>]+)>/.exec(m.von)?.[1] ?? (m.von.includes('@') ? m.von : null),
    p_telefon: k.telefon ?? null,
    p_vorname: k.vorname ?? null,
    p_nachname: k.nachname ?? null,
    p_plz: j.adresse?.plz ?? null,
  })
  return { erkannt: j, kandidaten, mail: { ...m, text: m.text.slice(0, 8000) } }
}

/** Gesprächsnotiz (getippt oder diktiert) ordnen: Art, Ergebnis, sauberer Text und nächste Aufgabe. */
export async function notiz(e: Eingabe, ich: Ich) {
  const text = frei(e, 'text', 8000)
  if (!text) throw new DienstFehler('eingabe', 400, 'text')
  const bezug = bezugFeld(e)
  const kontext = bezug
    ? await alsPerson(ich).rpc<Record<string, unknown>>('ki_kontext', { p_tabelle: bezug.tabelle, p_id: bezug.id })
    : null
  // Für die Notiz genügen Kunde und Stand; der ganze Verlauf würde nur kosten.
  const knapp = kontext ? { kunde: kontext.kunde, leads: kontext.leads, offerten: kontext.offerten } : null
  const a = await auswahlen()
  const cfg = await kiEinstellung()
  const r = await kiAufruf(
    { funktion: 'notiz', personId: ich.id, bezugTabelle: bezug?.tabelle, bezugId: bezug?.id },
    cfg,
    { system: L.SYSTEM_LESEN, teile: L.notizTeile(text, heute(), knapp), schema: L.notizSchema(a), maxTokens: 2500 },
  )
  const j = r.json as {
    art: string
    richtung: 'ein' | 'aus' | null
    ergebnis: string | null
    text: string
    aufgabe: { titel: string; faellig_am: string | null } | null
    felder: Record<string, unknown>
  }
  const datum = j.aufgabe?.faellig_am && /^\d{4}-\d{2}-\d{2}$/.test(j.aufgabe.faellig_am) ? j.aufgabe.faellig_am : null
  return {
    art: erlaubt(j.art, a.aktivitaet) ?? 'notiz',
    richtung: j.richtung,
    ergebnis: erlaubt(j.ergebnis, a.kontaktergebnis),
    text: kurz(j.text, 4000),
    aufgabe: j.aufgabe?.titel ? { titel: kurz(j.aufgabe.titel, 200), faellig_am: datum } : null,
    felder: j.felder,
  }
}

/** Spesenbeleg lesen (V233 spAiRead): Datum, Betrag, Währung, Kategorie, Zweck. */
export async function beleg(e: Eingabe, ich: Ich) {
  const datei = dateiFeld(e)
  const [f] = await dienst.lies<{ wert: { spesen_kategorien?: { schluessel: string; de: string }[] } }[]>(
    'einstellungen?schluessel=eq.finanzen&geloescht_am=is.null&select=wert',
  )
  const kategorien = f?.wert.spesen_kategorien ?? []
  const cfg = await kiEinstellung()
  const r = await kiAufruf({ funktion: 'beleg', personId: ich.id }, cfg, {
    system: L.SYSTEM_LESEN,
    teile: L.belegTeile(datei, kategorien),
    schema: L.belegSchema(kategorien.map((k) => k.schluessel)),
    maxTokens: 1500,
  })
  const j = r.json as {
    datum: string | null
    betrag: number | null
    waehrung: string | null
    kategorie: string | null
    zweck: string | null
    bemerkung: string | null
  }
  return {
    datum: j.datum && /^\d{4}-\d{2}-\d{2}$/.test(j.datum) ? j.datum : null,
    betrag_rappen: typeof j.betrag === 'number' && j.betrag > 0 ? Math.round(j.betrag * 100) : null,
    waehrung: kurz(j.waehrung, 5).toUpperCase() || null,
    kategorie: erlaubt(
      j.kategorie,
      kategorien.map((k) => k.schluessel),
    ),
    zweck: kurz(j.zweck, 80) || null,
    bemerkung: kurz(j.bemerkung, 200) || null,
  }
}

/** Offerten-PDF lesen, wenn die festen Regeln (Eturnity-Format) nichts fanden (V233 oiAi, offAiParse). */
export async function offertePdf(e: Eingabe, ich: Ich) {
  const text = frei(e, 'text', 14_000)
  if (text.length < 40) throw new DienstFehler('eingabe', 400, 'text')
  const cfg = await kiEinstellung()
  const r = await kiAufruf({ funktion: 'offerte_pdf', personId: ich.id }, cfg, {
    system: L.SYSTEM_LESEN,
    teile: L.offertePdfTeile(text),
    schema: L.OFFERTE_SCHEMA,
    maxTokens: 2000,
  })
  return { werte: r.json }
}

/** Luftbild analysieren (V233 tbAnalyse) und beim Lead als Ergebnis ablegen. */
export async function luftbild(e: Eingabe, ich: Ich) {
  const lead = idFeld(e, 'verkaufschance_id')
  const { teil } = await dokumentTeil(ich, idFeld(e, 'dokument_id'))
  if (teil.art !== 'bild') throw new DienstFehler('datei_typ', 415, 'luftbild')
  const cfg = await kiEinstellung()
  const r = await kiAufruf(
    { funktion: 'luftbild', personId: ich.id, bezugTabelle: 'verkaufschancen', bezugId: lead },
    cfg,
    {
      system: L.SYSTEM_LESEN,
      teile: L.luftbildTeile(teil),
      schema: L.LUFTBILD_SCHEMA,
      maxTokens: 4000,
      aufwand: 'medium',
    },
  )
  await speichereErgebnis('luftbild', 'verkaufschancen', lead, ich.id, spracheFeld(e), r.json, r.modell)
  return { analyse: r.json }
}
