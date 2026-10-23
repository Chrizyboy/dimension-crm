// Aktionen der Edge Function «ki», die zusammenfassen und einschätzen: Zusammenfassung auf Knopfdruck,
// Lead-Bewertung und Tagesbriefing. Ergebnisse bleiben gespeichert, damit niemand zweimal dafür bezahlt.

import { alsPerson, dienst, type Ich } from '../_shared/datenbank.ts'
import * as B from '../_shared/ki_bewerten.ts'
import { kiAufruf, kiEinstellung } from '../_shared/ki_rahmen.ts'
import { kurz } from '../_shared/ki_schema.ts'
import { bezugFeld, heute, idFeld, speichereErgebnis, spracheFeld } from './hilfe.ts'
import { DienstFehler } from '../_shared/http.ts'

type Eingabe = Record<string, unknown>

/** Zusammenfassung eines Kunden, Leads, einer Offerte, eines Projekts oder Service-Falls. */
export async function zusammenfassung(e: Eingabe, ich: Ich) {
  const bezug = bezugFeld(e)
  if (!bezug) throw new DienstFehler('eingabe', 400, 'bezug')
  const sprache = spracheFeld(e)
  const kontext = await alsPerson(ich).rpc('ki_kontext', { p_tabelle: bezug.tabelle, p_id: bezug.id })
  const cfg = await kiEinstellung()
  const r = await kiAufruf(
    { funktion: 'zusammenfassung', personId: ich.id, bezugTabelle: bezug.tabelle, bezugId: bezug.id },
    cfg,
    {
      system: B.systemIntern(sprache),
      teile: B.zusammenfassungTeile(kontext),
      schema: B.ZUSAMMENFASSUNG_SCHEMA,
      maxTokens: 3000,
    },
  )
  const j = r.json as { kurz: string; punkte: string[]; offen: string[]; naechster_schritt: string }
  const inhalt = {
    kurz: kurz(j.kurz, 800),
    punkte: (j.punkte ?? []).slice(0, 6).map((p) => kurz(p, 300)),
    offen: (j.offen ?? []).slice(0, 4).map((p) => kurz(p, 300)),
    naechster_schritt: kurz(j.naechster_schritt, 300),
  }
  await speichereErgebnis('zusammenfassung', bezug.tabelle, bezug.id, ich.id, sprache, inhalt, r.modell)
  return { zusammenfassung: inhalt }
}

/** Lead-Bewertung: Abschlusswahrscheinlichkeit mit Begründung, gestützt auf eigene Erfahrungswerte. */
export async function leadBewertung(e: Eingabe, ich: Ich) {
  const lead = idFeld(e, 'verkaufschance_id')
  const sprache = spracheFeld(e)
  const person = alsPerson(ich)
  const [kontext, statistik] = await Promise.all([
    person.rpc('ki_kontext', { p_tabelle: 'verkaufschancen', p_id: lead }),
    person.rpc('ki_lead_statistik', { p_lead: lead }),
  ])
  const cfg = await kiEinstellung()
  const r = await kiAufruf(
    { funktion: 'lead_bewertung', personId: ich.id, bezugTabelle: 'verkaufschancen', bezugId: lead },
    cfg,
    {
      system: B.systemIntern(sprache),
      teile: B.leadBewertungTeile(kontext, statistik, heute()),
      schema: B.LEAD_SCHEMA,
      maxTokens: 3000,
      aufwand: 'medium',
    },
  )
  const j = r.json as {
    wahrscheinlichkeit: number
    stufe: string
    sicherheit: string
    gruende: { text: string; richtung: string }[]
    naechster_schritt: string
  }
  const inhalt = {
    wahrscheinlichkeit: Math.max(0, Math.min(100, Math.round(j.wahrscheinlichkeit))),
    stufe: j.stufe,
    sicherheit: j.sicherheit,
    gruende: (j.gruende ?? []).slice(0, 5).map((g) => ({ text: kurz(g.text, 200), richtung: g.richtung })),
    naechster_schritt: kurz(j.naechster_schritt, 300),
  }
  await speichereErgebnis('lead_bewertung', 'verkaufschancen', lead, ich.id, sprache, inhalt, r.modell)
  return { bewertung: inhalt }
}

/**
 * Tagesbriefing (Bau-Auftrag 3.4, «Heute»): einmal pro Tag und Person; danach aus dem Speicher, ausser «neu».
 * Verweise («ref») nur, wenn sie in den Daten vorkommen.
 */
export async function briefing(e: Eingabe, ich: Ich) {
  const sprache = spracheFeld(e)
  const tag = heute()
  if (e.neu !== true) {
    const [alt] = await dienst.lies<{ inhalt: unknown; erstellt_am: string; sprache: string }[]>(
      `ki_ergebnisse?art=eq.briefing&bezug_tabelle=eq.personen&bezug_id=eq.${ich.id}&geloescht_am=is.null` +
        `&erstellt_am=gte.${tag}T00:00:00%2B00:00&select=inhalt,erstellt_am,sprache&order=erstellt_am.desc&limit=1`,
    )
    if (alt && alt.sprache === sprache)
      return { briefing: alt.inhalt, erstellt_am: alt.erstellt_am, aus_speicher: true }
  }
  const d = await alsPerson(ich).rpc('ki_briefing_daten', {})
  const cfg = await kiEinstellung()
  const r = await kiAufruf({ funktion: 'briefing', personId: ich.id, bezugTabelle: 'personen', bezugId: ich.id }, cfg, {
    system: B.systemIntern(sprache),
    teile: B.briefingTeile(d),
    schema: B.BRIEFING_SCHEMA,
    maxTokens: 3000,
  })
  const refs = B.refsIn(d)
  const j = r.json as {
    gruss: string
    einleitung: string
    prioritaeten: { titel: string; warum: string; ref: string | null }[]
    hinweis: string | null
  }
  const inhalt = {
    gruss: kurz(j.gruss, 200),
    einleitung: kurz(j.einleitung, 600),
    prioritaeten: (j.prioritaeten ?? []).slice(0, 5).map((p) => ({
      titel: kurz(p.titel, 160),
      warum: kurz(p.warum, 300),
      ref: p.ref && refs.has(p.ref) ? p.ref : null,
    })),
    hinweis: j.hinweis ? kurz(j.hinweis, 300) : null,
  }
  await speichereErgebnis('briefing', 'personen', ich.id, ich.id, sprache, inhalt, r.modell)
  return { briefing: inhalt, erstellt_am: new Date().toISOString(), aus_speicher: false }
}
