// Verbindungen zu Meta (Facebook-Seite und Instagram), LinkedIn (Firmenseite) und Canva, eine je Dienst für die
// ganze Firma (Entscheid 0022). Eine Person mit Recht «admin» meldet sich einmal an; das Token liegt
// verschlüsselt im Schema «intern». Adressen über META_URL, LINKEDIN_URL, CANVA_URL … umstellbar (Ersatz-Server).

import { dienst } from './datenbank.ts'
import { DienstFehler, leseJson, rufe } from './http.ts'
import { entschluessle, pkceChallenge, verschluessle, zufall } from './krypto.ts'
import { brauche, env } from './umgebung.ts'

/** Die drei Dienste. */
export type SocialDienst = 'meta' | 'linkedin' | 'canva'
export const SOCIAL_DIENSTE: SocialDienst[] = ['meta', 'linkedin', 'canva']

/** Basis-Adressen (Graph-API von Meta, REST von LinkedIn und Canva). */
export const metaBasis = () => env('META_URL') ?? 'https://graph.facebook.com/v21.0'
export const linkedinBasis = () => env('LINKEDIN_URL') ?? 'https://api.linkedin.com'
export const canvaBasis = () => env('CANVA_URL') ?? 'https://api.canva.com/rest/v1'
const metaLogin = () => env('META_LOGIN_URL') ?? 'https://www.facebook.com/v21.0/dialog/oauth'
const linkedinLogin = () => env('LINKEDIN_LOGIN_URL') ?? 'https://www.linkedin.com/oauth/v2'
const canvaLogin = () => env('CANVA_LOGIN_URL') ?? 'https://www.canva.com/api/oauth/authorize'

/** Wohin die Dienste nach der Anmeldung zurückleiten (in jeder App bei Meta, LinkedIn und Canva eintragen). */
export const socialRueckruf = () =>
  env('SOCIAL_RUECKRUF_URL') ?? `${brauche('SUPABASE_URL')}/functions/v1/social-rueckruf`

const BEREICHE: Record<SocialDienst, string> = {
  meta: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management',
  linkedin: 'w_organization_social r_organization_social rw_organization_admin',
  canva: 'design:content:read design:content:write design:meta:read asset:read asset:write brandtemplate:meta:read',
}

/** Welche Dienste eingerichtet sind (Secrets vorhanden), ohne Werte. */
export function socialEingerichtet(): Record<SocialDienst, boolean> {
  const s = Boolean(env('VERBINDUNG_SCHLUESSEL'))
  return {
    meta: s && Boolean(env('META_APP_ID') && env('META_APP_SECRET')),
    linkedin: s && Boolean(env('LINKEDIN_CLIENT_ID') && env('LINKEDIN_CLIENT_SECRET')),
    canva: s && Boolean(env('CANVA_CLIENT_ID') && env('CANVA_CLIENT_SECRET')),
  }
}

/** Adresse für «Verbinden»: state (einmalig, 10 Minuten) und bei Canva PKCE. */
export async function socialAnmeldeAdresse(d: SocialDienst, personId: string, sprache: string): Promise<string> {
  const zustand = zufall(24)
  const pruefwert = zufall(48)
  await dienst.rpc('social_zustand_anlegen', {
    p_zustand: zustand,
    p_dienst: d,
    p_person: personId,
    p_pruefwert: pruefwert,
    p_sprache: sprache,
  })
  const gemeinsam = { response_type: 'code', redirect_uri: socialRueckruf(), state: zustand }
  if (d === 'meta') {
    return `${metaLogin()}?${new URLSearchParams({ ...gemeinsam, client_id: brauche('META_APP_ID'), scope: BEREICHE.meta })}`
  }
  if (d === 'linkedin') {
    const q = new URLSearchParams({ ...gemeinsam, client_id: brauche('LINKEDIN_CLIENT_ID'), scope: BEREICHE.linkedin })
    return `${linkedinLogin()}/authorization?${q}`
  }
  const q = new URLSearchParams({
    ...gemeinsam,
    client_id: brauche('CANVA_CLIENT_ID'),
    scope: BEREICHE.canva,
    code_challenge: await pkceChallenge(pruefwert),
    code_challenge_method: 's256',
  })
  return `${canvaLogin()}?${q}`
}

interface Token {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
}

/** JSON lesen; bei Fehler DienstFehler mit kurzem Code. */
async function json<T>(res: Response, code: string): Promise<T> {
  const daten = await leseJson<T>(res)
  if (!res.ok || !daten) throw new DienstFehler(res.status === 401 ? 'neu_verbinden' : code, res.status, code)
  return daten
}

/** Token-Endpunkt von LinkedIn oder Canva (Formular; Canva mit Basic-Anmeldung). */
async function tokenHolen(d: 'linkedin' | 'canva', felder: Record<string, string>): Promise<Token> {
  const id = brauche(d === 'linkedin' ? 'LINKEDIN_CLIENT_ID' : 'CANVA_CLIENT_ID')
  const geheim = brauche(d === 'linkedin' ? 'LINKEDIN_CLIENT_SECRET' : 'CANVA_CLIENT_SECRET')
  const res = await rufe(
    d === 'linkedin' ? `${linkedinLogin()}/accessToken` : `${canvaBasis()}/oauth/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(d === 'canva' ? { Authorization: `Basic ${btoa(`${id}:${geheim}`)}` } : {}),
      },
      body: new URLSearchParams(d === 'linkedin' ? { ...felder, client_id: id, client_secret: geheim } : felder),
    },
    { versuche: 2 },
  )
  const t = (await leseJson<Token>(res)) ?? {}
  if (!res.ok || !t.access_token) {
    throw new DienstFehler(t.error === 'invalid_grant' ? 'neu_verbinden' : 'anmeldung', res.status, `${d}-Anmeldung`)
  }
  return t
}

const ablaufAus = (sekunden?: number) => (sekunden ? new Date(Date.now() + sekunden * 1000).toISOString() : null)

/** Meta: Code → langlebiges Token → Seiten-Token (läuft nicht ab) der eingestellten oder ersten Seite. */
async function metaAbschliessen(code: string) {
  const app = { client_id: brauche('META_APP_ID'), client_secret: brauche('META_APP_SECRET') }
  const kurz = await json<Token>(
    await rufe(
      `${metaBasis()}/oauth/access_token?${new URLSearchParams({ ...app, redirect_uri: socialRueckruf(), code })}`,
    ),
    'anmeldung',
  )
  const lang = await json<Token>(
    await rufe(
      `${metaBasis()}/oauth/access_token?${new URLSearchParams({ ...app, grant_type: 'fb_exchange_token', fb_exchange_token: kurz.access_token! })}`,
    ),
    'anmeldung',
  )
  const seiten = await json<{
    data?: {
      id: string
      name: string
      access_token: string
      instagram_business_account?: { id: string; username?: string }
    }[]
  }>(
    await rufe(
      `${metaBasis()}/me/accounts?${new URLSearchParams({ fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: lang.access_token! })}`,
    ),
    'meta',
  )
  const wunsch = env('META_SEITE_ID')
  const s = (seiten.data ?? []).find((x) => !wunsch || x.id === wunsch)
  if (!s) throw new DienstFehler('keine_seite', 404, 'Keine Facebook-Seite')
  return {
    name: s.name,
    konto: {
      seite_id: s.id,
      seite_name: s.name,
      instagram_id: s.instagram_business_account?.id ?? null,
      instagram_name: s.instagram_business_account?.username ?? null,
    },
    token: s.access_token,
    refresh: null,
    ablauf: null,
  }
}

/** LinkedIn: Token und Firmenseite (LINKEDIN_ORGANISATION oder die erste, die die Person verwaltet). */
async function linkedinAbschliessen(code: string) {
  const t = await tokenHolen('linkedin', { grant_type: 'authorization_code', code, redirect_uri: socialRueckruf() })
  const koepfe = {
    Authorization: `Bearer ${t.access_token!}`,
    'LinkedIn-Version': '202409',
    'X-Restli-Protocol-Version': '2.0.0',
  }
  let org = env('LINKEDIN_ORGANISATION')
  if (!org) {
    const acl = await json<{ elements?: { organization?: string; organizationTarget?: string }[] }>(
      await rufe(`${linkedinBasis()}/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR`, { headers: koepfe }),
      'linkedin',
    )
    const urn = acl.elements?.[0]?.organization ?? acl.elements?.[0]?.organizationTarget
    org = urn?.split(':').pop()
  }
  if (!org) throw new DienstFehler('keine_seite', 404, 'Keine LinkedIn-Firmenseite')
  const info = await leseJson<{ localizedName?: string }>(
    await rufe(`${linkedinBasis()}/rest/organizations/${org}`, { headers: koepfe }).catch(() => new Response('{}')),
  )
  const name = info?.localizedName ?? `LinkedIn ${org}`
  return {
    name,
    konto: { organisation: `urn:li:organization:${org}` },
    token: t.access_token!,
    refresh: t.refresh_token ?? null,
    ablauf: ablaufAus(t.expires_in),
  }
}

/** Canva: Token (4 Stunden) mit Refresh-Token, dazu der Anzeigename. */
async function canvaAbschliessen(code: string, pruefwert: string) {
  const t = await tokenHolen('canva', {
    grant_type: 'authorization_code',
    code,
    code_verifier: pruefwert,
    redirect_uri: socialRueckruf(),
  })
  const p = await leseJson<{ profile?: { display_name?: string } }>(
    await rufe(`${canvaBasis()}/users/me/profile`, { headers: { Authorization: `Bearer ${t.access_token!}` } }),
  )
  return {
    name: p?.profile?.display_name ?? 'Canva',
    konto: {},
    token: t.access_token!,
    refresh: t.refresh_token ?? null,
    ablauf: ablaufAus(t.expires_in),
  }
}

/** Rückruf nach der Anmeldung: Code einlösen und Verbindung verschlüsselt speichern. */
export async function socialAbschliessen(zustand: string, code: string): Promise<{ dienst: string; sprache: string }> {
  const [z] = await dienst.rpc<{ dienst: SocialDienst; person_id: string; pruefwert: string; sprache: string }[]>(
    'social_zustand_einloesen',
    { p_zustand: zustand },
  )
  if (!z) throw new DienstFehler('abgelaufen', 400, 'Anmeldung abgelaufen')
  const v =
    z.dienst === 'meta'
      ? await metaAbschliessen(code)
      : z.dienst === 'linkedin'
        ? await linkedinAbschliessen(code)
        : await canvaAbschliessen(code, z.pruefwert)
  const geheim = brauche('VERBINDUNG_SCHLUESSEL')
  await dienst.rpc('social_konto_speichern', {
    p_dienst: z.dienst,
    p_name: v.name,
    p_konto: v.konto,
    p_token: await verschluessle(v.token, geheim),
    p_refresh: v.refresh ? await verschluessle(v.refresh, geheim) : null,
    p_ablauf: v.ablauf,
    p_person: z.person_id,
  })
  return { dienst: z.dienst, sprache: z.sprache }
}

/** Verbindung trennen (Token löschen). */
export function socialTrennen(d: SocialDienst): Promise<unknown> {
  return dienst.rpc('social_konto_speichern', {
    p_dienst: d,
    p_name: '',
    p_konto: {},
    p_token: null,
    p_refresh: null,
    p_ablauf: null,
    p_person: null,
  })
}

/** Gültiger Zugang für einen Dienst: Token und Konto-Angaben; erneuert abgelaufene Tokens mit dem Refresh-Token. */
export async function socialZugang(d: SocialDienst): Promise<{ token: string; konto: Record<string, string | null> }> {
  const [v] = await dienst.rpc<
    { konto: Record<string, string | null>; token: string; refresh: string | null; ablauf: string | null }[]
  >('social_konto_lesen', { p_dienst: d })
  if (!v) throw new DienstFehler('nicht_verbunden', 409, `${d} nicht verbunden`)
  const geheim = brauche('VERBINDUNG_SCHLUESSEL')
  const lesen = (x: string) =>
    entschluessle(x, geheim).catch(() => {
      throw new DienstFehler('neu_verbinden', 409, 'Token nicht lesbar')
    })
  if (!v.ablauf || Date.parse(v.ablauf) > Date.now() + 120_000 || d === 'meta') {
    return { token: await lesen(v.token), konto: v.konto }
  }
  try {
    if (!v.refresh) throw new DienstFehler('neu_verbinden', 409, 'Abgelaufen')
    const t = await tokenHolen(d, { grant_type: 'refresh_token', refresh_token: await lesen(v.refresh) })
    await dienst.rpc('social_konto_genutzt', {
      p_dienst: d,
      p_token: await verschluessle(t.access_token!, geheim),
      p_refresh: t.refresh_token ? await verschluessle(t.refresh_token, geheim) : null,
      p_ablauf: ablaufAus(t.expires_in),
      p_fehler: null,
    })
    return { token: t.access_token!, konto: v.konto }
  } catch (f) {
    if (f instanceof DienstFehler && f.code === 'neu_verbinden') {
      await dienst.rpc('social_konto_genutzt', {
        p_dienst: d,
        p_token: null,
        p_refresh: null,
        p_ablauf: null,
        p_fehler: 'neu_verbinden',
      })
    }
    throw f
  }
}

/** Nach einem Aufruf mit 401 (Token widerrufen): Verbindung als «neu verbinden» markieren. */
export function socialUngueltig(d: SocialDienst): Promise<unknown> {
  return dienst.rpc('social_konto_genutzt', {
    p_dienst: d,
    p_token: null,
    p_refresh: null,
    p_ablauf: null,
    p_fehler: 'neu_verbinden',
  })
}
