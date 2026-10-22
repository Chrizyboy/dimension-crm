// Gemeinsamer Rahmen der Edge Functions, die die App aufruft: CORS, nur POST mit JSON, Anmeldung prüfen,
// Recht prüfen, Fehler in kurze Codes übersetzen. So sieht jede Funktion gleich aus und vergisst nichts.

import { antwort, CORS, fehlerAntwort } from './antwort.ts'
import { wer, type Ich } from './datenbank.ts'
import { DienstFehler } from './http.ts'

declare const Deno: { serve(h: (req: Request) => Promise<Response> | Response): unknown }

/** Eine Aktion: bekommt die Eingabe (JSON) und die angemeldete Person. */
export type Aktion = (eingabe: Record<string, unknown>, ich: Ich) => Promise<unknown>

/** Aktionen mit dem jeweils nötigen Recht (basis, preise, finanzen, admin). */
export type Aktionen = Record<string, { recht: string; f: Aktion }>

/** Prüft ein Recht; Admins dürfen alles. */
export function darf(ich: Ich, recht: string): boolean {
  return ich.rechte.includes('admin') || ich.rechte.includes(recht)
}

/** Text aus der Eingabe (leer = Fehler «eingabe»). */
export function textFeld(e: Record<string, unknown>, name: string): string {
  const w = e[name]
  if (typeof w !== 'string' || !w.trim()) throw new DienstFehler('eingabe', 400, name)
  return w.trim()
}

/** Bearbeitet eine Anfrage der App: { aktion, ...eingabe } → { ok: true, ...ergebnis }. */
export async function bearbeite(req: Request, aktionen: Aktionen): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return antwort(405, { ok: false, fehler: 'methode' })
  try {
    const ich = await wer(req)
    if (!ich) return antwort(401, { ok: false, fehler: 'anmeldung' })
    const eingabe = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
    const a = aktionen[String(eingabe.aktion ?? '')]
    if (!a) return antwort(400, { ok: false, fehler: 'aktion' })
    if (!darf(ich, a.recht)) return antwort(403, { ok: false, fehler: 'kein_recht' })
    const ergebnis = await a.f(eingabe, ich)
    return antwort(200, { ok: true, ...(ergebnis && typeof ergebnis === 'object' ? ergebnis : { wert: ergebnis }) })
  } catch (f) {
    return fehlerAntwort(f)
  }
}

/** Startet eine Funktion mit diesen Aktionen. */
export function starte(aktionen: Aktionen): void {
  Deno.serve((req) => bearbeite(req, aktionen))
}
