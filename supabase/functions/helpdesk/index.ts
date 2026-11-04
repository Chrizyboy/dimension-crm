// Edge Function «helpdesk»: die Schnittstelle, über die Claude die Meldungen aus «Fehler melden» bearbeitet
// (stündliche Aufgabe, siehe docs/helpdesk.md). Ohne Supabase-Login, geschützt durch HELPDESK_SCHLUESSEL im Kopf
// «x-helpdesk-schluessel». Claude kann damit nur lesen, eine Einschätzung ablegen und nach dem Entscheid der
// entscheidenden Person abschliessen; entscheiden kann nur ein Mensch im CRM (rueckmeldung_entscheiden).
//  * offen          was zu prüfen und was abzuschliessen ist; jede Meldung mit `bilder` (Name + Link, 1 Stunde gültig)
//  * einschaetzen   { id, einschaetzung: { kurz, was, ursache, auswirkung, loesung, aufwand, risiko, empfehlung } }
//  * abschliessen   { id, ergebnis: erledigt|abgelehnt, antwort, version? }

import { antwort, fehlerAntwort } from '../_shared/antwort.ts'
import { dienst } from '../_shared/datenbank.ts'
import { DienstFehler } from '../_shared/http.ts'
import { LINK_GUELTIG_S, anhaengeAbfrage, bilderJeMeldung, type MeldungAnhang } from '../_shared/helpdesk_bilder.ts'
import { env } from '../_shared/umgebung.ts'

declare const Deno: { serve(h: (req: Request) => Promise<Response>): unknown }

/** Vergleicht zwei Texte in gleichbleibender Zeit (Schutz gegen Raten über die Antwortzeit). */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/** Prüft, dass eine ID wie eine UUID aussieht, bevor sie an die Datenbank geht. */
function id(e: Record<string, unknown>): string {
  const w = e.id
  if (typeof w !== 'string' || !/^[0-9a-f-]{36}$/i.test(w)) throw new DienstFehler('eingabe', 400, 'id')
  return w
}

type Liste = { id: string; [k: string]: unknown }[]

/**
 * Hängt jeder Meldung ihre Bildschirmfotos als kurz gültige Links an (Chris 04.11.2026: die Prüfung soll sehen, was
 * nicht geht). Klappt ein Link nicht, fehlt nur dieses Bild; `bilder_fehlen` sagt wie viele.
 */
async function mitBildern(offen: Record<string, unknown>): Promise<Record<string, unknown>> {
  const listen = ['pruefen', 'abschliessen'].map((k) => (Array.isArray(offen[k]) ? (offen[k] as Liste) : []))
  const ids = [...new Set(listen.flat().map((m) => m.id))]
  if (!ids.length) return offen
  const je = bilderJeMeldung(await dienst.lies<MeldungAnhang[]>(anhaengeAbfrage(ids)))
  for (const m of listen.flat()) {
    const bilder = je.get(m.id) ?? []
    const links = await Promise.all(
      bilder.map(async (b) => {
        try {
          return { name: b.name, url: await dienst.signiert('dokumente', b.speicher_pfad as string, LINK_GUELTIG_S) }
        } catch {
          return null
        }
      }),
    )
    m.bilder = links.filter(Boolean)
    if (links.includes(null)) m.bilder_fehlen = links.filter((l) => !l).length
  }
  return offen
}

/** Link für die SMS: öffnet die Meldung im CRM (Web-App), damit man mit einem Tipp entscheidet. */
function link(meldung: string): string | null {
  const basis = env('APP_URL')
  return basis ? `${basis.replace(/\/+$/, '')}/#/knowledge?ansicht=meldungen&meldung=${meldung}` : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return antwort(405, { ok: false, fehler: 'methode' })
  const schluessel = env('HELPDESK_SCHLUESSEL')
  if (!schluessel || !gleich(req.headers.get('x-helpdesk-schluessel') ?? '', schluessel)) {
    return antwort(401, { ok: false, fehler: 'schluessel' })
  }
  try {
    const e = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
    switch (e.aktion) {
      case 'offen':
        return antwort(200, {
          ok: true,
          ...(await mitBildern(await dienst.rpc<Record<string, unknown>>('helpdesk_offen', {}))),
        })
      case 'einschaetzen': {
        const m = id(e)
        const r = await dienst.rpc<Record<string, unknown>>('helpdesk_einschaetzen', {
          p_id: m,
          p: e.einschaetzung ?? {},
          p_link: link(m),
        })
        return antwort(200, { ok: true, ...r })
      }
      case 'abschliessen': {
        const r = await dienst.rpc<Record<string, unknown>>('helpdesk_abschliessen', {
          p_id: id(e),
          p_ergebnis: e.ergebnis,
          p_antwort: e.antwort,
          p_version: typeof e.version === 'string' ? e.version : null,
        })
        return antwort(200, { ok: true, ...r })
      }
      default:
        return antwort(400, { ok: false, fehler: 'aktion' })
    }
  } catch (f) {
    return fehlerAntwort(f)
  }
})
