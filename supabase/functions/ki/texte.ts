// Aktionen der Edge Function «ki», die Texte schreiben: Kundentext-Entwurf und Überarbeitung (Assistent),
// Schreibstil lernen, Marketing-Texte, Social-Media-Posts und Lead-Monatsbericht.

import { alsPerson, dienst, type Ich } from '../_shared/datenbank.ts'
import { DienstFehler } from '../_shared/http.ts'
import { systemIntern } from '../_shared/ki_bewerten.ts'
import { kiAufruf, kiEinstellung, persoenlicherStil } from '../_shared/ki_rahmen.ts'
import { kurz } from '../_shared/ki_schema.ts'
import * as T from '../_shared/ki_texte.ts'
import { anhaengeLaden, anonymisiere, bezugFeld, frei, spracheFeld, type Sprache } from './hilfe.ts'

type Eingabe = Record<string, unknown>

const wunschListe = (w: unknown): string[] =>
  Array.isArray(w)
    ? w
        .filter((x): x is string => typeof x === 'string')
        .map((x) => x.slice(0, 500))
        .slice(-8)
    : []

const textPaar = (w: unknown): { betreff: string; text: string } | null => {
  const o = w as { betreff?: unknown; text?: unknown } | null
  return o && typeof o.text === 'string' ? { betreff: kurz(o.betreff, 300), text: o.text.slice(0, 12_000) } : null
}

/** Kundentext schreiben oder überarbeiten (V233 KI-Assistent): mit Kontext, Anhängen und persönlichem Stil. */
export async function entwurf(e: Eingabe, ich: Ich) {
  const art = frei(e, 'art', 40) || 'frei'
  if (!(art in T.KUNDEN_TEXTE)) throw new DienstFehler('eingabe', 400, 'art')
  const bezug = bezugFeld(e)
  const kontext = bezug
    ? await alsPerson(ich).rpc<Record<string, unknown>>('ki_kontext', { p_tabelle: bezug.tabelle, p_id: bezug.id })
    : null
  const sprache = spracheFeld(e, (kontext?.kunde as { sprache?: string } | undefined)?.sprache)
  const anh =
    bezug && e.anhaenge === true
      ? await anhaengeLaden(ich, [bezug.id, ...ids(kontext)])
      : { teile: [], gelesen: [], uebersprungen: [] }
  const cfg = await kiEinstellung()
  const system = T.systemKundentext(sprache, ich.name, cfg.stil[sprache], await persoenlicherStil(ich.id, ich.name))
  const r = await kiAufruf(
    { funktion: 'entwurf', personId: ich.id, bezugTabelle: bezug?.tabelle, bezugId: bezug?.id },
    cfg,
    {
      system,
      teile: T.entwurfTeile(
        {
          art,
          sprache,
          wunsch: frei(e, 'wunsch', 2000),
          eingang: frei(e, 'eingang', 12_000),
          bisher: textPaar(e.bisher),
          wuensche: wunschListe(e.wuensche),
        },
        kontext,
        anh.teile,
      ),
      schema: T.ENTWURF_SCHEMA,
      maxTokens: 6000,
      aufwand: 'medium',
    },
  )
  const j = r.json as { betreff: string; text: string; hinweise: string[] }
  return {
    betreff: kurz(j.betreff, 300),
    text: kurz(j.text, 12_000),
    hinweise: (j.hinweise ?? []).map((h) => kurz(h, 300)).slice(0, 6),
    sprache,
    an: (kontext?.kunde as { email?: string } | undefined)?.email ?? null,
    anhaenge: { gelesen: anh.gelesen, uebersprungen: anh.uebersprungen },
  }
}

/** IDs von Lead, Offerte, Projekt und Kunde aus dem Kontext (für Anhänge). */
function ids(kontext: Record<string, unknown> | null): string[] {
  if (!kontext) return []
  const haupt = (l: unknown) =>
    Array.isArray(l)
      ? (l as { id?: string; hauptsache?: boolean }[]).filter((x) => x.hauptsache && x.id).map((x) => x.id!)
      : []
  return [...haupt(kontext.leads), ...haupt(kontext.offerten), ...haupt(kontext.projekte)]
}

/**
 * Schreibstil lernen (V233 aisLearn): Unverändert übernommen = nur als Beispiel merken (kostet nichts);
 * geändert oder mit Wünschen = Regeln mit der KI zusammenführen. Beispiele ohne Namen und Adressen.
 */
export async function stilLernen(e: Eingabe, ich: Ich) {
  const endfassung = frei(e, 'endfassung', 6000)
  const entwurfText = frei(e, 'entwurf', 6000)
  if (!endfassung) throw new DienstFehler('eingabe', 400, 'endfassung')
  const bezug = bezugFeld(e)
  const kontext = bezug
    ? await alsPerson(ich)
        .rpc('ki_kontext', { p_tabelle: bezug.tabelle, p_id: bezug.id })
        .catch(() => null)
    : null
  const [alt] = await dienst.lies<{ id: string; regeln: unknown; beispiele: unknown; anzahl: number }[]>(
    `schreibstile?person_id=eq.${ich.id}&geloescht_am=is.null&select=id,regeln,beispiele,anzahl`,
  )
  const regeln = Array.isArray(alt?.regeln)
    ? (alt.regeln as unknown[]).filter((r): r is string => typeof r === 'string')
    : []
  const beispiele = [
    ...(Array.isArray(alt?.beispiele) ? (alt.beispiele as unknown[]) : []),
    {
      art: frei(e, 'art', 40) || null,
      text: anonymisiere(endfassung, kontext).slice(0, 3000),
      am: new Date().toISOString(),
    },
  ].slice(-4)
  const wuensche = wunschListe(e.wuensche)
  let neu = regeln
  if (e.geaendert === true || wuensche.length) {
    const cfg = await kiEinstellung()
    const r = await kiAufruf({ funktion: 'stil_lernen', personId: ich.id }, cfg, {
      system: systemIntern('de'),
      teile: T.stilLernenTeile(ich.name, regeln, entwurfText, endfassung, wuensche),
      schema: T.STIL_SCHEMA,
      maxTokens: 3000,
    })
    const vorschlag = ((r.json as { regeln?: unknown[] }).regeln ?? [])
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0 && x.length < 300)
      .slice(0, 15)
    if (vorschlag.length) neu = vorschlag
  }
  const werte = { regeln: neu, beispiele, anzahl: (alt?.anzahl ?? 0) + 1 }
  if (alt) await dienst.aendere(`schreibstile?id=eq.${alt.id}`, werte)
  else await dienst.schreibe('schreibstile', { person_id: ich.id, ...werte })
  return { regeln: neu, neue: neu.filter((r) => !regeln.includes(r)).length }
}

/** Serien-Mail, Serienbrief, Aktion oder Newsletter (V233 aiSend «marketing», nlAi) in einer oder beiden Sprachen. */
export async function marketingText(e: Eingabe, ich: Ich) {
  const art = frei(e, 'art', 40) || 'mail'
  if (!(art in T.MARKETING_TEXTE)) throw new DienstFehler('eingabe', 400, 'art')
  const sprachen = (Array.isArray(e.sprachen) ? e.sprachen : ['de']).filter(
    (s): s is Sprache => s === 'de' || s === 'fr',
  )
  if (!sprachen.length) throw new DienstFehler('eingabe', 400, 'sprachen')
  const bisher: Partial<Record<Sprache, { betreff: string; text: string }>> = {}
  for (const s of sprachen) {
    const p = textPaar((e.bisher as Record<string, unknown> | undefined)?.[s])
    if (p?.text.trim()) bisher[s] = p
  }
  // Newsletter: Stil früherer, von Hand überarbeiteter Newsletter übernehmen (V233 nlAi «So schreibt unser Team»).
  const beispiele =
    art === 'newsletter'
      ? (
          await dienst.lies<{ text_de: string | null; text_fr: string | null }[]>(
            'newsletter?status=eq.versendet&geloescht_am=is.null&select=text_de,text_fr&order=versendet_am.desc&limit=3',
          )
        )
          .map((n) => n.text_de || n.text_fr || '')
          .filter(Boolean)
      : []
  const cfg = await kiEinstellung()
  const r = await kiAufruf({ funktion: 'marketing_text', personId: ich.id }, cfg, {
    system: T.systemMarketing(cfg.stil.de),
    teile: T.marketingTeile({ art, sprachen, wunsch: frei(e, 'wunsch', 3000), bisher, beispiele }),
    schema: T.marketingSchema(sprachen),
    maxTokens: 6000,
    aufwand: 'medium',
  })
  const j = r.json as Record<string, { betreff?: string; text?: string }>
  return {
    texte: Object.fromEntries(
      sprachen.map((s) => [s, { betreff: kurz(j[s]?.betreff, 200), text: kurz(j[s]?.text, 12_000) }]),
    ),
  }
}

/** Social-Media-Posts (V233 smWrite), auch zu einer Referenzanlage ohne Kundendaten. */
export async function social(e: Eingabe, ich: Ich) {
  const netzwerke = (Array.isArray(e.netzwerke) ? e.netzwerke : []).filter(
    (n): n is string => n === 'instagram' || n === 'facebook' || n === 'linkedin',
  )
  if (!netzwerke.length) throw new DienstFehler('eingabe', 400, 'netzwerke')
  const sprache = e.sprache === 'fr' || e.sprache === 'de_fr' ? e.sprache : 'de'
  const sprachen: Sprache[] = sprache === 'de_fr' ? ['de', 'fr'] : [sprache]
  const thema = frei(e, 'thema', 1000)
  const projektId = typeof e.projekt_id === 'string' ? e.projekt_id : null
  if (!thema && !projektId) throw new DienstFehler('eingabe', 400, 'thema')
  const [m] = await dienst.lies<{ wert: { social?: { regeln?: Record<string, string> } } }[]>(
    'einstellungen?schluessel=eq.marketing&select=wert',
  )
  let anlage: unknown = null
  if (projektId) {
    const k = await alsPerson(ich).rpc<{
      projekte?: { anlage?: unknown; titel?: string }[]
      objekte?: { ort?: string }[]
    }>('ki_kontext', { p_tabelle: 'projekte', p_id: projektId })
    // Nur Technik und Ort, nie Namen, Strasse oder Beträge (Regel: keine Kundendaten in Posts).
    anlage = { anlage: k.projekte?.[0]?.anlage ?? null, ort: k.objekte?.[0]?.ort ?? null }
  }
  const cfg = await kiEinstellung()
  const r = await kiAufruf({ funktion: 'social', personId: ich.id }, cfg, {
    system: T.systemMarketing(''),
    teile: T.socialTeile({
      thema: thema || 'Referenzanlage vorstellen',
      netzwerke,
      sprache,
      regeln: m?.wert.social?.regeln ?? {},
      wunsch: frei(e, 'wunsch', 1000),
      bisher: e.bisher ?? null,
      anlage,
    }),
    schema: T.socialSchema(netzwerke, sprachen),
    maxTokens: 5000,
    aufwand: 'medium',
  })
  const j = r.json as { texte: Record<string, Record<string, string>>; thema: string }
  return { texte: j.texte, thema: kurz(j.thema, 40) }
}

/** Lead-Monatsbericht an den Anbieter (V233 lbAiText). Die Fakten rechnet die App, die KI formuliert nur. */
export async function monatsbericht(e: Eingabe, ich: Ich) {
  const anbieter = frei(e, 'anbieter', 120)
  if (!anbieter || !e.fakten || typeof e.fakten !== 'object') throw new DienstFehler('eingabe', 400, 'fakten')
  const cfg = await kiEinstellung()
  const r = await kiAufruf({ funktion: 'monatsbericht', personId: ich.id }, cfg, {
    system: T.SYSTEM_PARTNER,
    teile: T.monatsberichtTeile({
      anbieter,
      fakten: e.fakten,
      vorlage: frei(e, 'vorlage', 6000),
      aktuell: frei(e, 'aktuell', 6000),
      wunsch: frei(e, 'wunsch', 1000),
    }),
    schema: T.MONATSBERICHT_SCHEMA,
    maxTokens: 4000,
  })
  return { text: kurz((r.json as { text: string }).text, 10_000).replace(/^\s*(Betreff|Objet)\s*:.*\n+/i, '') }
}
