// Posts veröffentlichen: Facebook-Seite und Instagram über die Graph-API von Meta, LinkedIn-Firmenseite über die
// Posts-API. Nur für Posts, die eine Person freigegeben hat (social_freigeben), geholt mit social_beanspruchen.
// Ein Netzwerk, das schon gepostet ist, wird nie ein zweites Mal gepostet. Schreibende Aufrufe ohne Wiederholung.

import { dienst } from './datenbank.ts'
import { DienstFehler, leseJson, rufe } from './http.ts'
import { linkedinBasis, metaBasis, socialUngueltig, socialZugang } from './social_konten.ts'
import { linkedinText, postText, type Netzwerk, type PostDaten } from './social_text.ts'

/** Ergebnis je Netzwerk (landet in social_posts.ergebnis). */
export interface NetzErgebnis {
  ok: boolean
  id?: string
  url?: string
  fehler?: string
}

interface Bild {
  speicher_pfad: string
  mime_typ: string | null
}

/** Erstes Bild des Posts aus der Ablage (Ordner «marketing»). */
async function bildLesen(p: PostDaten): Promise<Bild | null> {
  const id = p.bilder[0]
  if (!id) return null
  const [d] = await dienst.lies<Bild[]>(`dokumente?id=eq.${id}&geloescht_am=is.null&select=speicher_pfad,mime_typ`)
  if (!d?.speicher_pfad) throw new DienstFehler('bild_fehlt', 404, 'Bild fehlt')
  return d
}

/** Aufruf der Graph-API von Meta (Formular), Fehler als kurzer Code. */
async function meta<T>(pfad: string, felder: Record<string, string>, methode: 'GET' | 'POST' = 'POST'): Promise<T> {
  const q = new URLSearchParams(felder)
  const res = await rufe(
    methode === 'GET' ? `${metaBasis()}${pfad}?${q}` : `${metaBasis()}${pfad}`,
    methode === 'GET'
      ? {}
      : { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: q },
    { versuche: methode === 'GET' ? 2 : 1, zeitlimitMs: 20_000 },
  )
  const daten = await leseJson<T & { error?: { code?: number; message?: string } }>(res)
  if (!res.ok || !daten) {
    // Code 190 = Token ungültig (Passwort geändert, App entfernt): neu verbinden
    if (daten?.error?.code === 190) {
      await socialUngueltig('meta')
      throw new DienstFehler('neu_verbinden', res.status, 'Meta')
    }
    throw new DienstFehler('meta', res.status, daten?.error?.message?.slice(0, 120) ?? 'Meta')
  }
  return daten
}

async function facebook(text: string, bild: Bild | null): Promise<NetzErgebnis> {
  const { token, konto } = await socialZugang('meta')
  const seite = konto.seite_id
  if (!seite) throw new DienstFehler('keine_seite', 409, 'Keine Seite')
  const r: { id: string; post_id?: string } = bild
    ? await meta<{ id: string; post_id?: string }>(`/${seite}/photos`, {
        url: await dienst.signiert('dokumente', bild.speicher_pfad),
        caption: text,
        access_token: token,
      })
    : await meta<{ id: string }>(`/${seite}/feed`, { message: text, access_token: token })
  const id = r.post_id ?? r.id
  return { ok: true, id, url: `https://www.facebook.com/${id}` }
}

async function instagram(text: string, bild: Bild | null): Promise<NetzErgebnis> {
  if (!bild) throw new DienstFehler('bild_fehlt', 400, 'Instagram braucht ein Bild')
  const { token, konto } = await socialZugang('meta')
  const ig = konto.instagram_id
  if (!ig) throw new DienstFehler('kein_instagram', 409, 'Kein Instagram-Konto an der Seite')
  const behaelter = await meta<{ id: string }>(`/${ig}/media`, {
    image_url: await dienst.signiert('dokumente', bild.speicher_pfad),
    caption: text,
    access_token: token,
  })
  // Instagram lädt das Bild selbst; erst veröffentlichen, wenn es fertig ist (meist sofort, höchstens ~10 s).
  for (let i = 0; i < 10; i++) {
    const s = await meta<{ status_code?: string }>(
      `/${behaelter.id}`,
      { fields: 'status_code', access_token: token },
      'GET',
    )
    if (s.status_code === 'FINISHED' || !s.status_code) break
    if (s.status_code === 'ERROR') throw new DienstFehler('bild_abgelehnt', 400, 'Instagram lehnt das Bild ab')
    await new Promise((r) => setTimeout(r, 1000))
  }
  const post = await meta<{ id: string }>(`/${ig}/media_publish`, { creation_id: behaelter.id, access_token: token })
  const link = await meta<{ permalink?: string }>(
    `/${post.id}`,
    { fields: 'permalink', access_token: token },
    'GET',
  ).catch(() => ({ permalink: undefined }))
  return { ok: true, id: post.id, ...(link.permalink ? { url: link.permalink } : {}) }
}

async function linkedin(text: string, bild: Bild | null): Promise<NetzErgebnis> {
  const { token, konto } = await socialZugang('linkedin')
  const org = konto.organisation
  if (!org) throw new DienstFehler('keine_seite', 409, 'Keine Firmenseite')
  const koepfe = {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': '202409',
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  }
  const pruefe = async (res: Response) => {
    if (res.ok) return
    if (res.status === 401) {
      await socialUngueltig('linkedin')
      throw new DienstFehler('neu_verbinden', 401, 'LinkedIn')
    }
    const d = await leseJson<{ message?: string }>(res)
    throw new DienstFehler('linkedin', res.status, d?.message?.slice(0, 120) ?? 'LinkedIn')
  }
  let bildUrn: string | null = null
  if (bild) {
    const init = await rufe(
      `${linkedinBasis()}/rest/images?action=initializeUpload`,
      { method: 'POST', headers: koepfe, body: JSON.stringify({ initializeUploadRequest: { owner: org } }) },
      { versuche: 1 },
    )
    await pruefe(init)
    const v = (await leseJson<{ value: { uploadUrl: string; image: string } }>(init))!.value
    const hoch = await rufe(
      v.uploadUrl,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: await dienst.datei('dokumente', bild.speicher_pfad),
      },
      { versuche: 1, zeitlimitMs: 30_000 },
    )
    await pruefe(hoch)
    bildUrn = v.image
  }
  const res = await rufe(
    `${linkedinBasis()}/rest/posts`,
    {
      method: 'POST',
      headers: koepfe,
      body: JSON.stringify({
        author: org,
        commentary: linkedinText(text),
        visibility: 'PUBLIC',
        distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
        ...(bildUrn ? { content: { media: { id: bildUrn } } } : {}),
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    },
    { versuche: 1, zeitlimitMs: 20_000 },
  )
  await pruefe(res)
  const id = res.headers.get('x-restli-id') ?? ''
  return { ok: true, id, ...(id ? { url: `https://www.linkedin.com/feed/update/${id}` } : {}) }
}

/** Fehler → kurzer Code. Nach Zeitlimit ist offen, ob der Post erschien: «unklar», bitte im Netzwerk nachsehen. */
function fehlerCode(f: unknown): string {
  if (f instanceof DienstFehler) return f.code === 'zeitlimit' || f.code === 'netzwerk' ? 'unklar' : f.code
  const m = f instanceof Error ? f.message : ''
  return m.startsWith('konfiguration:') ? 'nicht_eingerichtet' : 'intern'
}

/** Einen beanspruchten Post auf allen noch offenen Netzwerken veröffentlichen und das Ergebnis eintragen. */
export async function postVeroeffentlichen(p: PostDaten): Promise<Partial<Record<Netzwerk, NetzErgebnis>>> {
  const ergebnis: Partial<Record<Netzwerk, NetzErgebnis>> = {}
  let bild: Bild | null = null
  try {
    bild = await bildLesen(p)
  } catch (f) {
    for (const n of p.netzwerke) if (!p.ergebnis[n]?.ok) ergebnis[n] = { ok: false, fehler: fehlerCode(f) }
    await dienst.rpc('social_ergebnis', { p_id: p.id, p_ergebnis: ergebnis })
    return ergebnis
  }
  for (const n of p.netzwerke) {
    if (p.ergebnis[n]?.ok) continue
    const text = postText(p, n)
    try {
      ergebnis[n] =
        n === 'facebook'
          ? await facebook(text, bild)
          : n === 'instagram'
            ? await instagram(text, bild)
            : await linkedin(text, bild)
    } catch (f) {
      ergebnis[n] = { ok: false, fehler: fehlerCode(f) }
    }
  }
  await dienst.rpc('social_ergebnis', { p_id: p.id, p_ergebnis: ergebnis })
  return ergebnis
}

/** Fällige (oder einen bestimmten) Posts holen und veröffentlichen. Gibt zurück, wie viele es waren. */
export async function postsAbarbeiten(id: string | null = null): Promise<{ posts: number; fehler: number }> {
  const posts = await dienst.rpc<PostDaten[]>('social_beanspruchen', { p_id: id, p_limit: 5 })
  let fehler = 0
  for (const p of posts) {
    const e = await postVeroeffentlichen(p)
    if (Object.values(e).some((x) => !x.ok)) fehler++
  }
  return { posts: posts.length, fehler }
}
