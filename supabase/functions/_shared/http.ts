// Aufrufe fremder Dienste (Microsoft, AbaNinja, ASPSMS): immer mit Zeitlimit und Wiederholung mit Backoff
// (Bau-Auftrag Abschnitt 5). Wiederholt wird nur, was gefahrlos wiederholbar ist: Netzfehler vor einer
// Antwort, 429 und 5xx bei lesenden Aufrufen. Ein Versand (Mail, SMS) wird nie automatisch wiederholt,
// sonst käme er womöglich doppelt an. Läuft in Deno (Edge Functions) und in Node (Tests).

/** Bytes einer Datei (als Typ so, dass fetch und WebCrypto sie direkt annehmen). */
export type Bytes = ReturnType<typeof Uint8Array.from>

/** Optionen für einen Aufruf. */
export interface AufrufOptionen {
  zeitlimitMs?: number
  /** Wie oft insgesamt versucht wird (1 = keine Wiederholung). */
  versuche?: number
  /** Wartezeit vor dem 2. Versuch; danach jeweils doppelt. */
  backoffMs?: number
  /** Für Tests: Ersatz für setTimeout. */
  warte?: (ms: number) => Promise<void>
}

/** Fehler eines fremden Dienstes, mit HTTP-Status (0 = keine Antwort) und kurzem Code für die App. */
export class DienstFehler extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    meldung: string,
  ) {
    super(meldung)
    this.name = 'DienstFehler'
  }
}

const warteStandard = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Wie lange laut «Retry-After» gewartet werden soll (höchstens 5 s, damit die Funktion nicht hängt). */
export function wartezeit(kopf: string | null, standardMs: number): number {
  if (!kopf) return standardMs
  const sekunden = Number(kopf)
  if (Number.isFinite(sekunden)) return Math.min(5000, Math.max(0, sekunden * 1000))
  const zeit = Date.parse(kopf)
  return Number.isFinite(zeit) ? Math.min(5000, Math.max(0, zeit - Date.now())) : standardMs
}

/**
 * fetch mit Zeitlimit und Wiederholung. Gibt die Antwort zurück (auch 4xx), wirft DienstFehler nur,
 * wenn nach allen Versuchen keine brauchbare Antwort kam (Netz, Zeitlimit, 429/5xx).
 */
export async function rufe(url: string, init: RequestInit = {}, o: AufrufOptionen = {}): Promise<Response> {
  const versuche = Math.max(1, o.versuche ?? 3)
  const warte = o.warte ?? warteStandard
  let pause = o.backoffMs ?? 500
  let letzter: DienstFehler | null = null
  for (let i = 0; i < versuche; i++) {
    if (i > 0) {
      await warte(pause)
      pause *= 2
    }
    let res: Response
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(o.zeitlimitMs ?? 10_000) })
    } catch (f) {
      const zeit = f instanceof Error && (f.name === 'TimeoutError' || f.name === 'AbortError')
      letzter = new DienstFehler(
        zeit ? 'zeitlimit' : 'netzwerk',
        0,
        zeit ? 'Zeitlimit überschritten' : 'Keine Verbindung',
      )
      continue
    }
    if (res.status === 429 || res.status >= 500) {
      letzter = new DienstFehler(res.status === 429 ? 'zu_viele' : 'dienst', res.status, `Antwort ${res.status}`)
      if (i < versuche - 1) {
        pause = wartezeit(res.headers.get('retry-after'), pause)
        await res.body?.cancel()
        continue
      }
      return res
    }
    return res
  }
  throw letzter ?? new DienstFehler('netzwerk', 0, 'Keine Verbindung')
}

/** JSON lesen, ohne bei leerer oder kaputter Antwort abzustürzen. */
export async function leseJson<T = unknown>(res: Response): Promise<T | null> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
