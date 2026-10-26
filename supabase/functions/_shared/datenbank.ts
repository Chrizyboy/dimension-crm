// Datenbank-Zugriff aus den Edge Functions über die REST-Schnittstelle von Supabase. Zwei Wege:
// mit dem Login der aufrufenden Person (Rechte wie in der App) oder mit dem Service-Schlüssel
// (nur für Server-Aufgaben wie Token speichern oder den Ausgangskorb abarbeiten).

import { DienstFehler, leseJson, rufe, type Bytes } from './http.ts'
import { brauche, env } from './umgebung.ts'

/** Wer ruft auf? Ergebnis von meine_anmeldung() mit dem Login der Person. */
export interface Ich {
  id: string
  kuerzel: string
  name: string
  email: string
  rechte: string[]
  /** Login der Person (nur im Speicher, nie zurückgeben), für Abfragen mit ihren Rechten. */
  auth?: string
}

/** Aufruf der REST-Schnittstelle. */
async function rest<T>(
  pfad: string,
  schluessel: string,
  auth: string,
  init: RequestInit = {},
  zeitlimitMs = 8000,
): Promise<T> {
  const res = await rufe(
    `${brauche('SUPABASE_URL')}${pfad}`,
    {
      ...init,
      headers: { apikey: schluessel, Authorization: auth, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    },
    { versuche: init.method && init.method !== 'GET' ? 1 : 2, zeitlimitMs },
  )
  const daten = await leseJson<T & { message?: string }>(res)
  if (!res.ok) {
    throw new DienstFehler((daten as { message?: string } | null)?.message ?? 'datenbank', res.status, 'Datenbank')
  }
  return daten as T
}

/** Die aufrufende Person mit ihren Rechten; null, wenn nicht angemeldet. */
export async function wer(req: Request): Promise<Ich | null> {
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  try {
    const ich = await rest<Ich | null>('/rest/v1/rpc/meine_anmeldung', brauche('SUPABASE_ANON_KEY'), auth, {
      method: 'POST',
      body: '{}',
    })
    return ich ? { ...ich, auth } : null
  } catch {
    return null
  }
}

/**
 * Zugriff mit dem Login der Person: dieselben Rechte (RLS) wie in der App. Für alles, was die KI über Kunden lesen
 * darf, damit sie nie mehr sieht als die Person, die fragt.
 */
export function alsPerson(ich: Ich) {
  if (!ich.auth) throw new DienstFehler('anmeldung', 401, 'Ohne Login')
  const auth = ich.auth
  return {
    rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
      return rest<T>(`/rest/v1/rpc/${name}`, brauche('SUPABASE_ANON_KEY'), auth, {
        method: 'POST',
        body: JSON.stringify(args),
      })
    },
    lies<T>(pfad: string): Promise<T> {
      return rest<T>(`/rest/v1/${pfad}`, brauche('SUPABASE_ANON_KEY'), auth)
    },
  }
}

/** Zugriff mit dem Service-Schlüssel (umgeht RLS – nur für Server-Aufgaben). */
export const dienst = {
  /** RPC-Funktion aufrufen (zeitlimitMs nur für lange Arbeiten wie das Wiederherstellen einer Sicherung). */
  rpc<T>(name: string, args: Record<string, unknown>, zeitlimitMs?: number): Promise<T> {
    const k = brauche('SUPABASE_SERVICE_ROLE_KEY')
    return rest<T>(
      `/rest/v1/rpc/${name}`,
      k,
      `Bearer ${k}`,
      { method: 'POST', body: JSON.stringify(args) },
      zeitlimitMs,
    )
  },
  /** Lesen, z. B. «personen?id=eq.…&select=id,email». */
  lies<T>(pfad: string, schema = 'public'): Promise<T> {
    const k = brauche('SUPABASE_SERVICE_ROLE_KEY')
    return rest<T>(`/rest/v1/${pfad}`, k, `Bearer ${k}`, { headers: { 'Accept-Profile': schema } })
  },
  /** Einfügen oder (mit upsert) ersetzen. */
  schreibe(tabelle: string, zeilen: unknown, schema = 'public', upsert = false): Promise<unknown> {
    const k = brauche('SUPABASE_SERVICE_ROLE_KEY')
    return rest(`/rest/v1/${tabelle}`, k, `Bearer ${k}`, {
      method: 'POST',
      body: JSON.stringify(zeilen),
      headers: {
        'Content-Profile': schema,
        Prefer: upsert ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
      },
    })
  },
  /** Ändern, z. B. «microsoft_verbindungen?person_id=eq.…». */
  aendere(pfad: string, werte: unknown, schema = 'public'): Promise<unknown> {
    const k = brauche('SUPABASE_SERVICE_ROLE_KEY')
    return rest(`/rest/v1/${pfad}`, k, `Bearer ${k}`, {
      method: 'PATCH',
      body: JSON.stringify(werte),
      headers: { 'Content-Profile': schema, Prefer: 'return=minimal' },
    })
  },
  /** Datei aus dem Speicher holen (für Anhänge). */
  async datei(bucket: string, pfad: string): Promise<Bytes> {
    const k = brauche('SUPABASE_SERVICE_ROLE_KEY')
    const res = await rufe(
      `${brauche('SUPABASE_URL')}/storage/v1/object/${bucket}/${pfad.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { apikey: k, Authorization: `Bearer ${k}` } },
      { zeitlimitMs: 15_000 },
    )
    if (!res.ok) throw new DienstFehler('datei_fehlt', res.status, 'Datei')
    return new Uint8Array(await res.arrayBuffer())
  },
  /** Datei in den Speicher legen (z. B. ein aus Canva geholtes Bild); ersetzen = gleichnamige überschreiben. */
  async hochladen(bucket: string, pfad: string, bytes: Bytes, typ: string, ersetzen = false): Promise<void> {
    const k = brauche('SUPABASE_SERVICE_ROLE_KEY')
    const res = await rufe(
      `${brauche('SUPABASE_URL')}/storage/v1/object/${bucket}/${pfad.split('/').map(encodeURIComponent).join('/')}`,
      {
        method: 'POST',
        headers: {
          apikey: k,
          Authorization: `Bearer ${k}`,
          'Content-Type': typ,
          ...(ersetzen ? { 'x-upsert': 'true' } : {}),
        },
        body: bytes,
      },
      { versuche: 1, zeitlimitMs: 60_000 },
    )
    if (!res.ok) throw new DienstFehler('speicher', res.status, 'Speicher')
  },
  /** Dateien aus dem Speicher entfernen (nur für abgelaufene Sicherungen; Fachdaten nie hart löschen). */
  async entfernen(bucket: string, pfade: string[]): Promise<void> {
    if (!pfade.length) return
    const k = brauche('SUPABASE_SERVICE_ROLE_KEY')
    const res = await rufe(
      `${brauche('SUPABASE_URL')}/storage/v1/object/${bucket}`,
      {
        method: 'DELETE',
        headers: { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: pfade }),
      },
      { versuche: 2 },
    )
    if (!res.ok) throw new DienstFehler('speicher', res.status, 'Speicher')
  },
  /**
   * Kurz gültige Adresse einer Datei, die ein fremder Dienst selbst abholt (Meta lädt Bilder nur per Adresse).
   * Basis-Adresse SPEICHER_URL, falls die Funktion intern eine andere Adresse sieht als der Dienst von aussen.
   */
  async signiert(bucket: string, pfad: string, sekunden = 900): Promise<string> {
    const k = brauche('SUPABASE_SERVICE_ROLE_KEY')
    const res = await rufe(
      `${brauche('SUPABASE_URL')}/storage/v1/object/sign/${bucket}/${pfad.split('/').map(encodeURIComponent).join('/')}`,
      {
        method: 'POST',
        headers: { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: sekunden }),
      },
      { versuche: 2 },
    )
    const daten = await leseJson<{ signedURL?: string }>(res)
    if (!res.ok || !daten?.signedURL) throw new DienstFehler('datei_fehlt', res.status, 'Datei')
    return `${env('SPEICHER_URL') ?? brauche('SUPABASE_URL')}/storage/v1${daten.signedURL}`
  },
}

/**
 * Aufruf eines fremden Dienstes ins Protokoll schreiben (ohne Inhalte und Geheimnisse). Ein Fehler beim
 * Protokollieren darf die eigentliche Aufgabe nie stören.
 */
export async function protokolliere(e: {
  dienst: string
  aktion: string
  ok: boolean
  status?: number | undefined
  dauerMs?: number | undefined
  meldung?: string | undefined
  personId?: string | null | undefined
}): Promise<void> {
  try {
    await dienst.schreibe('integrations_protokoll', {
      dienst: e.dienst,
      aktion: e.aktion,
      ok: e.ok,
      status: e.status ?? null,
      dauer_ms: e.dauerMs ?? null,
      meldung: e.meldung?.slice(0, 300) ?? null,
      person_id: e.personId ?? null,
    })
  } catch {
    console.warn('protokoll nicht geschrieben')
  }
}

/** Führt f aus, misst die Dauer und protokolliert Erfolg oder Fehler. */
export async function gemessen<T>(
  dienstName: string,
  aktion: string,
  personId: string | null,
  f: () => Promise<T>,
): Promise<T> {
  const start = Date.now()
  try {
    const r = await f()
    await protokolliere({ dienst: dienstName, aktion, ok: true, dauerMs: Date.now() - start, personId })
    return r
  } catch (fehler) {
    const df = fehler instanceof DienstFehler ? fehler : null
    await protokolliere({
      dienst: dienstName,
      aktion,
      ok: false,
      status: df?.status,
      dauerMs: Date.now() - start,
      meldung: df?.code ?? (fehler instanceof Error ? fehler.message.split(':')[0] : 'fehler'),
      personId,
    })
    throw fehler
  }
}
