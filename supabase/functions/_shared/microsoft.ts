// Microsoft 365 pro Person (Entscheid Chris 22.10.2026): Jede Person meldet sich einmal bei Microsoft an
// («Mit Microsoft verbinden»). Das CRM bekommt dabei ein Refresh-Token, das verschlüsselt in der Datenbank
// liegt (Schema «intern», für die App unsichtbar). Damit holt der Server bei Bedarf ein kurzes Zugangs-Token
// und ruft Microsoft Graph im Namen dieser Person auf – nie mit mehr Rechten, als die Person selbst hat.
// Adressen sind über MS_LOGIN_URL / MS_GRAPH_URL umstellbar (Tests mit einem Ersatz-Server).

import { dienst } from './datenbank.ts'
import { DienstFehler, leseJson, rufe, type AufrufOptionen, type Bytes } from './http.ts'
import { entschluessle, pkceChallenge, verschluessle, zufall } from './krypto.ts'
import { brauche, env } from './umgebung.ts'

/** Delegierte Rechte (Entra-App «Dimension CRM»). Team-Postfächer und info@ über Stellvertretung (.Shared). */
export const BEREICHE = [
  'offline_access',
  'openid',
  'email',
  'profile',
  'User.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'Mail.Read.Shared',
  'Mail.Send.Shared',
  'Calendars.ReadWrite',
  'Sites.ReadWrite.All',
].join(' ')

const loginBasis = () => env('MS_LOGIN_URL') ?? 'https://login.microsoftonline.com'
/** Basis-Adresse von Microsoft Graph (v1.0). */
export const graphBasis = () => env('MS_GRAPH_URL') ?? 'https://graph.microsoft.com/v1.0'
const tokenAdresse = () => `${loginBasis()}/${brauche('MS_TENANT_ID')}/oauth2/v2.0/token`
/** Wohin Microsoft nach der Anmeldung zurückleitet (muss in der Entra-App eingetragen sein). */
export const rueckrufAdresse = () =>
  env('MS_RUECKRUF_URL') ?? `${brauche('SUPABASE_URL')}/functions/v1/microsoft-rueckruf`

/** Antwort des Token-Endpunkts. */
interface TokenAntwort {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  id_token?: string
  scope?: string
  error?: string
}

/** Inhalt des id_token, den das CRM braucht. */
export interface Anmeldedaten {
  email: string
  tenant: string
}

/**
 * Liest E-Mail und Mandant aus dem id_token. Die Signatur prüfen wir nicht: Das Token kommt direkt vom
 * Token-Endpunkt über TLS (OpenID Connect Core 3.1.3.7), nie aus dem Browser.
 */
export function anmeldedatenLesen(idToken: string | undefined): Anmeldedaten | null {
  const teil = idToken?.split('.')[1]
  if (!teil) return null
  try {
    const json = atob(teil.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((teil.length + 3) % 4))
    const daten = JSON.parse(new TextDecoder().decode(Uint8Array.from(json, (c) => c.charCodeAt(0)))) as Record<
      string,
      unknown
    >
    const email = String(daten.preferred_username ?? daten.email ?? daten.upn ?? '').toLowerCase()
    return email ? { email, tenant: String(daten.tid ?? '') } : null
  } catch {
    return null
  }
}

/**
 * Passt das Microsoft-Konto zur Person im CRM? Gleiche Mail (ohne Gross/Klein) und, wenn ein Mandant
 * (Tenant-ID) eingerichtet ist, derselbe Mandant. Verhindert, dass jemand ein fremdes Postfach verbindet.
 */
export function kontoPasst(daten: Anmeldedaten | null, personEmail: string, tenant: string): boolean {
  if (!daten) return false
  const mandantOk = !/^[0-9a-f-]{36}$/i.test(tenant) || daten.tenant.toLowerCase() === tenant.toLowerCase()
  return mandantOk && daten.email === personEmail.trim().toLowerCase()
}

/** Adresse, auf die «Mit Microsoft verbinden» führt. Merkt sich state und PKCE-Prüfwert 10 Minuten. */
export async function anmeldeAdresse(personId: string, email: string, sprache: string): Promise<string> {
  const zustand = zufall(24)
  const pruefwert = zufall(48)
  await dienst.rpc('ms_zustand_anlegen', {
    p_zustand: zustand,
    p_person: personId,
    p_pruefwert: pruefwert,
    p_sprache: sprache,
  })
  const q = new URLSearchParams({
    client_id: brauche('MS_CLIENT_ID'),
    response_type: 'code',
    redirect_uri: rueckrufAdresse(),
    response_mode: 'query',
    scope: BEREICHE,
    state: zustand,
    code_challenge: await pkceChallenge(pruefwert),
    code_challenge_method: 'S256',
    login_hint: email,
    prompt: 'select_account',
  })
  return `${loginBasis()}/${brauche('MS_TENANT_ID')}/oauth2/v2.0/authorize?${q}`
}

async function tokenHolen(felder: Record<string, string>): Promise<TokenAntwort> {
  const res = await rufe(
    tokenAdresse(),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: brauche('MS_CLIENT_ID'),
        client_secret: brauche('MS_CLIENT_SECRET'),
        scope: BEREICHE,
        ...felder,
      }),
    },
    { versuche: 2 },
  )
  const daten = (await leseJson<TokenAntwort>(res)) ?? {}
  if (!res.ok || !daten.access_token) {
    throw new DienstFehler(
      daten.error === 'invalid_grant' ? 'neu_verbinden' : 'anmeldung',
      res.status,
      'Microsoft-Anmeldung',
    )
  }
  return daten
}

/** Ergebnis des Rückrufs nach der Anmeldung. */
export interface Rueckruf {
  personId: string
  sprache: string
  konto: string
}

/** Rückruf von Microsoft: Code einlösen, Konto prüfen, Refresh-Token verschlüsselt speichern. */
export async function anmeldungAbschliessen(zustand: string, code: string): Promise<Rueckruf> {
  const [z] = await dienst.rpc<{ person_id: string; pruefwert: string; sprache: string; email: string }[]>(
    'ms_zustand_einloesen',
    { p_zustand: zustand },
  )
  if (!z) throw new DienstFehler('abgelaufen', 400, 'Anmeldung abgelaufen')
  const t = await tokenHolen({
    grant_type: 'authorization_code',
    code,
    redirect_uri: rueckrufAdresse(),
    code_verifier: z.pruefwert,
  })
  const daten = anmeldedatenLesen(t.id_token)
  if (!kontoPasst(daten, z.email, brauche('MS_TENANT_ID'))) {
    throw new DienstFehler('falsches_konto', 403, 'Anderes Microsoft-Konto')
  }
  if (!t.refresh_token) throw new DienstFehler('anmeldung', 400, 'Kein Refresh-Token')
  await dienst.rpc('ms_verbindung_speichern', {
    p_person: z.person_id,
    p_konto: daten!.email,
    p_token: await verschluessle(t.refresh_token, brauche('VERBINDUNG_SCHLUESSEL')),
    p_bereiche: t.scope ?? BEREICHE,
  })
  return { personId: z.person_id, sprache: z.sprache, konto: daten!.email }
}

/** Verbindung trennen: Token löschen (bei Microsoft selbst kann die Person die App unter myapps entfernen). */
export function trennen(personId: string): Promise<unknown> {
  return dienst.rpc('ms_verbindung_speichern', { p_person: personId, p_konto: '', p_token: null, p_bereiche: null })
}

// Zugangs-Tokens leben eine Stunde und werden wiederverwendet, aber nur, solange die gespeicherte
// Verbindung dieselbe ist: Nach «Trennen» (oder neuem Verbinden) gilt das alte Token sofort nicht mehr.
const zwischenspeicher = new Map<string, { token: string; bis: number }>()

/** Zugangs-Token für eine Person. Ohne Verbindung oder bei abgelaufener Anmeldung: Fehler «neu_verbinden». */
export async function zugang(personId: string): Promise<string> {
  const [v] = await dienst.rpc<{ konto: string; token: string }[]>('ms_verbindung_lesen', { p_person: personId })
  if (!v) throw new DienstFehler('nicht_verbunden', 409, 'Nicht mit Microsoft verbunden')
  const gemerkt = zwischenspeicher.get(`${personId}:${v.token}`)
  if (gemerkt && gemerkt.bis > Date.now() + 60_000) return gemerkt.token
  const geheim = brauche('VERBINDUNG_SCHLUESSEL')
  let t: TokenAntwort
  try {
    t = await tokenHolen({ grant_type: 'refresh_token', refresh_token: await entschluessle(v.token, geheim) })
  } catch (f) {
    if (f instanceof DienstFehler && f.code === 'neu_verbinden') {
      await dienst.rpc('ms_verbindung_genutzt', { p_person: personId, p_token: null, p_fehler: 'neu_verbinden' })
    }
    throw f
  }
  // Microsoft gibt meist ein neues Refresh-Token aus (Rotation); das alte bleibt eine Weile gültig.
  const neu = t.refresh_token ? await verschluessle(t.refresh_token, geheim) : null
  await dienst.rpc('ms_verbindung_genutzt', { p_person: personId, p_token: neu, p_fehler: null })
  zwischenspeicher.set(`${personId}:${neu ?? v.token}`, {
    token: t.access_token!,
    bis: Date.now() + (t.expires_in ?? 3600) * 1000,
  })
  return t.access_token!
}

/** Optionen für einen Graph-Aufruf. */
export interface GraphOptionen extends AufrufOptionen {
  methode?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  inhalt?: unknown
  /** Datei-Inhalt statt JSON (SharePoint-Upload). */
  roh?: Bytes
  koepfe?: Record<string, string>
}

/**
 * Microsoft Graph im Namen der Person aufrufen. pfad relativ («/me/events») oder absolut (nextLink).
 * Schreibende Aufrufe werden nicht wiederholt (sonst doppelte Termine oder Mails).
 */
export async function graph<T = unknown>(personId: string, pfad: string, o: GraphOptionen = {}): Promise<T> {
  const methode = o.methode ?? 'GET'
  const res = await rufe(
    pfad.startsWith('http') ? pfad : `${graphBasis()}${pfad}`,
    {
      method: methode,
      headers: {
        Authorization: `Bearer ${await zugang(personId)}`,
        ...(o.inhalt !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...o.koepfe,
      },
      ...(o.roh ? { body: o.roh } : o.inhalt !== undefined ? { body: JSON.stringify(o.inhalt) } : {}),
    },
    { versuche: methode === 'GET' ? 3 : 1, ...o },
  )
  const daten = await leseJson<T & { error?: { code?: string } }>(res)
  if (!res.ok) {
    const code = res.status === 403 ? 'kein_zugriff' : res.status === 404 ? 'nicht_gefunden' : 'graph'
    throw new DienstFehler(code, res.status, (daten as { error?: { code?: string } } | null)?.error?.code ?? 'Graph')
  }
  return daten as T
}

/** Alle Seiten einer Graph-Liste lesen (höchstens maxSeiten, damit eine Funktion nie hängt). */
export async function graphAlle<T>(personId: string, pfad: string, maxSeiten = 5, koepfe?: Record<string, string>) {
  const alle: T[] = []
  let naechste: string | undefined = pfad
  for (let i = 0; naechste && i < maxSeiten; i++) {
    const seite: { value?: T[]; '@odata.nextLink'?: string } = await graph(personId, naechste, koepfe ? { koepfe } : {})
    alle.push(...(seite.value ?? []))
    naechste = seite['@odata.nextLink']
  }
  return alle
}
