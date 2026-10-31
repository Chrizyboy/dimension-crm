// Aufruf der Claude API (Messages) für die KI-Funktionen der Phase 13. Nur der Server kennt den Schlüssel
// (Secret ANTHROPIC_API_KEY); die App ruft nie direkt an. Läuft in Deno (Edge Functions) und in Node (Tests).
// Bewusst über den gemeinsamen Aufruf `rufe` (Zeitlimit, Wiederholung, Protokoll) statt über das SDK, siehe
// Entscheid 0024: Die Edge Functions laden keine npm-Pakete, und alle anderen Dienste laufen ebenso.

import { DienstFehler, leseJson, rufe } from './http.ts'
import { brauche, env } from './umgebung.ts'

/** API-Version der Messages-Schnittstelle (Kopf «anthropic-version»). */
export const API_VERSION = '2026-10-21'

/** Ein Teil der Eingabe: Text, Bild (JPEG/PNG/WebP) oder PDF, Bilder und PDF als Base64. */
export type Teil =
  { art: 'text'; text: string } | { art: 'bild'; typ: string; base64: string } | { art: 'pdf'; base64: string }

/** Was die KI tun soll. Der Systemtext enthält Regeln und Stil, die Teile die Aufgabe und die Daten. */
export interface KiAnfrage {
  modell: string
  system: string
  teile: Teil[]
  /** JSON-Schema der Antwort (strukturierte Ausgabe); ohne Schema kommt freier Text. */
  schema?: Record<string, unknown>
  maxTokens: number
  /** Wie gründlich die KI nachdenkt (kostet Ausgabe-Tokens). */
  aufwand?: 'low' | 'medium' | 'high'
  /** Werkzeuge des Servers von Anthropic, z. B. die Websuche. Nicht zusammen mit «schema» (Quellenangaben). */
  werkzeuge?: Record<string, unknown>[]
}

/** Verbrauch eines Aufrufs in Tokens. */
export interface Nutzung {
  ein: number
  aus: number
  cacheLesen: number
  cacheSchreiben: number
}

/** Antwort der KI: Text, bei Schema das gelesene JSON, Verbrauch und das Modell, das geantwortet hat. */
export interface KiAntwort {
  text: string
  json: unknown
  nutzung: Nutzung
  modell: string
  /** Zahl der Websuchen (kosten zusätzlich, siehe «websuche_usd_je_1000»). */
  websuchen: number
}

/** Preise eines Modells in USD je Million Tokens. */
export interface Preis {
  ein: number
  aus: number
  cache_lesen?: number
  cache_schreiben?: number
}

/**
 * Kosten in Tausendstel-Rappen: Tokens × USD je Million × Kurs × 100 Rappen × 1000. Unbekanntes Modell: 0,
 * damit ein fehlender Preis nie einen Aufruf verhindert (die Einstellung zeigt dann «Preis fehlt»).
 */
export function kostenMillirappen(n: Nutzung, preis: Preis | undefined, usdChf: number): number {
  if (!preis) return 0
  const usd =
    n.ein * preis.ein +
    n.aus * preis.aus +
    n.cacheLesen * (preis.cache_lesen ?? preis.ein * 0.1) +
    n.cacheSchreiben * (preis.cache_schreiben ?? preis.ein * 1.25)
  return Math.round((usd / 1_000_000) * usdChf * 100 * 1000)
}

/** Serverseitiger Ersatz bei einer Ablehnung gibt es nur für Opus und Sonnet der 5er-Reihe. */
function mitErsatzmodell(modell: string): boolean {
  return /^claude-(opus|sonnet)-5/.test(modell)
}

function block(t: Teil): Record<string, unknown> {
  if (t.art === 'text') return { type: 'text', text: t.text }
  if (t.art === 'bild') return { type: 'image', source: { type: 'base64', media_type: t.typ, data: t.base64 } }
  return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: t.base64 } }
}

/**
 * Baut den Inhalt der Anfrage (ohne Schlüssel); getrennt, damit Tests ihn prüfen können. «bisher» ist die Antwort
 * einer pausierten Runde (pause_turn): Sie geht unverändert als Antwort des Assistenten mit, dann macht der Server
 * dort weiter.
 */
export function anfrageInhalt(a: KiAnfrage, bisher?: unknown[]): Record<string, unknown> {
  return {
    model: a.modell,
    max_tokens: a.maxTokens,
    // Der Systemtext (Regeln, Firmenstil) ist bei jedem Aufruf gleich: zwischenspeichern spart Kosten.
    system: [{ type: 'text', text: a.system, cache_control: { type: 'ephemeral' } }],
    messages: [
      { role: 'user', content: a.teile.map(block) },
      ...(bisher ? [{ role: 'assistant', content: bisher }] : []),
    ],
    ...(a.werkzeuge?.length ? { tools: a.werkzeuge } : {}),
    output_config: {
      effort: a.aufwand ?? 'low',
      ...(a.schema ? { format: { type: 'json_schema', schema: a.schema } } : {}),
    },
    ...(mitErsatzmodell(a.modell) ? { fallbacks: 'default' } : {}),
  }
}

interface RohAntwort {
  model?: string
  stop_reason?: string
  content?: { type: string; text?: string }[]
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
    server_tool_use?: { web_search_requests?: number }
  }
  error?: { type?: string }
}

/** Verbrauch aus der Antwort (fehlende Felder = 0). */
export function nutzungAus(r: RohAntwort): Nutzung {
  const u = r.usage ?? {}
  return {
    ein: u.input_tokens ?? 0,
    aus: u.output_tokens ?? 0,
    cacheLesen: u.cache_read_input_tokens ?? 0,
    cacheSchreiben: u.cache_creation_input_tokens ?? 0,
  }
}

/** Fehler mit Verbrauch: auch ein abgelehnter oder abgeschnittener Aufruf kostet und wird protokolliert. */
export class KiFehler extends DienstFehler {
  constructor(
    code: string,
    status: number,
    readonly nutzung: Nutzung,
    readonly modell: string,
  ) {
    super(code, status, code)
    this.name = 'KiFehler'
  }
}

/** Höchstens so oft eine pausierte Runde (pause_turn, z. B. viele Websuchen) fortsetzen. */
const FORTSETZUNGEN = 3

function plus(a: Nutzung, b: Nutzung): Nutzung {
  return {
    ein: a.ein + b.ein,
    aus: a.aus + b.aus,
    cacheLesen: a.cacheLesen + b.cacheLesen,
    cacheSchreiben: a.cacheSchreiben + b.cacheSchreiben,
  }
}

/** Fragt Claude. Wirft DienstFehler mit kurzem Code (ki_abgelehnt, ki_zu_lang, ki_antwort, ki_dienst …). */
export async function frageClaude(a: KiAnfrage): Promise<KiAntwort> {
  const basis = env('ANTHROPIC_URL') ?? 'https://api.anthropic.com'
  let bisher: unknown[] | undefined
  let summe: Nutzung = { ein: 0, aus: 0, cacheLesen: 0, cacheSchreiben: 0 }
  let websuchen = 0
  let r: RohAntwort = {}
  for (let runde = 0; ; runde++) {
    const res = await rufe(
      `${basis}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': brauche('ANTHROPIC_API_KEY'),
          'anthropic-version': API_VERSION,
          ...(mitErsatzmodell(a.modell) ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}),
        },
        body: JSON.stringify(anfrageInhalt(a, bisher)),
      },
      // Lesen ist gefahrlos wiederholbar (429, 5xx, 529 «überlastet»); Denken und Suchen brauchen Zeit.
      { versuche: 2, zeitlimitMs: a.werkzeuge?.length ? 240_000 : 120_000, backoffMs: 1500 },
    )
    r = (await leseJson<RohAntwort>(res)) ?? {}
    if (!res.ok) {
      const typ = r.error?.type ?? ''
      const code =
        res.status === 401 || res.status === 403
          ? 'ki_schluessel'
          : res.status === 429
            ? 'ki_ueberlastet'
            : res.status === 413 || typ === 'request_too_large'
              ? 'ki_zu_gross'
              : res.status >= 500
                ? 'ki_dienst'
                : 'ki_anfrage'
      throw new DienstFehler(code, res.status, `Claude ${res.status}`)
    }
    summe = plus(summe, nutzungAus(r))
    websuchen += r.usage?.server_tool_use?.web_search_requests ?? 0
    // Der Server hat seine Runde mit Werkzeugen unterbrochen: Antwort mitschicken, er macht dort weiter.
    if (r.stop_reason !== 'pause_turn' || runde >= FORTSETZUNGEN) break
    bisher = r.content ?? []
  }
  const nutzung = summe
  const modell = r.model ?? a.modell
  // Ablehnung zuerst prüfen: der Inhalt passt dann nicht zum Schema.
  if (r.stop_reason === 'refusal') throw new KiFehler('ki_abgelehnt', 422, nutzung, modell)
  if (r.stop_reason === 'max_tokens' || r.stop_reason === 'pause_turn')
    throw new KiFehler('ki_zu_lang', 422, nutzung, modell)
  const text = (r.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
  let json: unknown = null
  if (a.schema) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new KiFehler('ki_antwort', 502, nutzung, modell)
    }
  }
  return { text, json, nutzung, modell, websuchen }
}
