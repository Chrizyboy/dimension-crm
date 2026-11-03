// Ersatz-Server für Meta (Facebook-Seiten DE/FR, Instagram), LinkedIn und Canva – nur für Tests. Antwortet wie die echten
// Dienste, soweit das CRM sie nutzt, und merkt sich jeden Post, damit der Test prüfen kann, was gesendet wurde.
// Ersetzt NICHT den Test mit echten Konten (siehe docs/marketing.md).

import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'

// Kleinstes gültiges JPEG (1×1 Pixel), als «Export» aus Canva
const JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
)

/**
 * Startet den Ersatz-Server.
 * @param {{ port: number, host: string }} o host = wie die Edge Functions (in Docker) den Server erreichen
 */
export function starteSocialErsatz({ port, host }) {
  const z = {
    aufrufe: [],
    codes: new Map(), // code → { dienst, challenge }
    fb: [],
    ig: [],
    li: [],
    hochgeladen: [],
    designs: [],
    exporte: [],
    abgelaufen: new Set(), // Tokens, die der Test für ungültig erklärt
  }
  const neu = (vorsilbe) => `${vorsilbe}-${randomUUID()}`
  const json = (res, status, daten, koepfe = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...koepfe })
    res.end(JSON.stringify(daten))
  }
  const lies = (req) =>
    new Promise((ok) => {
      const teile = []
      req.on('data', (c) => teile.push(c))
      req.on('end', () => ok(Buffer.concat(teile)))
    })
  const formular = (roh) => Object.fromEntries(new URLSearchParams(roh.toString('utf8')))
  const bearer = (req) => (req.headers.authorization ?? '').replace(/^Bearer /, '')

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const roh = await lies(req)
    const p = url.pathname
    const q = url.searchParams
    z.aufrufe.push(`${req.method} ${p}`)

    // --- Anmeldung: alle drei Dienste leiten direkt mit Code zurück ---------------------------------------
    for (const [pfad, dienst] of [
      ['/meta/dialog', 'meta'],
      ['/linkedin-login/authorization', 'linkedin'],
      ['/canva-login', 'canva'],
    ]) {
      if (p === pfad) {
        const code = neu('code')
        z.codes.set(code, { dienst, challenge: q.get('code_challenge') })
        const ziel = new URL(q.get('redirect_uri'))
        ziel.searchParams.set('code', code)
        ziel.searchParams.set('state', q.get('state'))
        res.writeHead(302, { Location: ziel.toString() })
        return res.end()
      }
    }

    // --- Meta (Graph-API) --------------------------------------------------------------------------------
    if (p === '/meta-graph/oauth/access_token') {
      if (q.get('fb_exchange_token')) return json(res, 200, { access_token: neu('meta-lang'), expires_in: 5_184_000 })
      const c = z.codes.get(q.get('code'))
      if (!c || c.dienst !== 'meta' || q.get('client_secret') !== 'meta-geheim') {
        return json(res, 400, { error: { code: 100, message: 'Invalid code' } })
      }
      z.codes.delete(q.get('code'))
      return json(res, 200, { access_token: neu('meta-kurz'), expires_in: 3600 })
    }
    const metaToken = () => (req.method === 'GET' ? q.get('access_token') : formular(roh).access_token)
    if (p.startsWith('/meta-graph/') && z.abgelaufen.has(metaToken())) {
      return json(res, 400, { error: { code: 190, message: 'Error validating access token' } })
    }
    // Zwei Seiten wie bei Dimension Solaire: französisch (Sàrl, Bulle) und deutsch (GmbH, Muri), je mit Instagram
    const SEITEN = {
      1001: {
        token: 'seite-token',
        ig: '2002',
        name: 'Dimension Solaire Sàrl (Ersatz)',
        ig_name: 'dimension.solaire.bulle',
      },
      1002: {
        token: 'seite-token-de',
        ig: '2003',
        name: 'Dimension Solaire GmbH (Ersatz)',
        ig_name: 'dimension.solaire.muri',
      },
    }
    if (p === '/meta-graph/me/accounts') {
      return json(res, 200, {
        data: Object.entries(SEITEN).map(([id, s]) => ({
          id,
          name: s.name,
          access_token: s.token,
          instagram_business_account: { id: s.ig, username: s.ig_name },
        })),
      })
    }
    const seitePost = /^\/meta-graph\/(100[12])\/(photos|feed)$/.exec(p)
    if (seitePost) {
      const [, seite, art] = seitePost
      const f = formular(roh)
      if (f.access_token !== SEITEN[seite].token) return json(res, 400, { error: { code: 190, message: 'token' } })
      const id = String(3000 + z.fb.length)
      z.fb.push({ seite, art: art === 'photos' ? 'foto' : 'text', text: f.caption ?? f.message, bild: f.url ?? null })
      return json(res, 200, art === 'photos' ? { id, post_id: `${seite}_${id}` } : { id: `${seite}_${id}` })
    }
    const igMedia = /^\/meta-graph\/(200[23])\/media$/.exec(p)
    if (igMedia) {
      const f = formular(roh)
      const s = Object.values(SEITEN).find((x) => x.ig === igMedia[1])
      if (f.access_token !== s.token) return json(res, 400, { error: { code: 190, message: 'token' } })
      // Instagram lädt das Bild selbst: die Adresse muss erreichbar sein, und nur JPEG ist erlaubt
      const bild = await fetch(f.image_url.replace(host, '127.0.0.1')).catch(() => null)
      if (!bild?.ok) return json(res, 400, { error: { code: 9004, message: 'Bild nicht erreichbar' } })
      if (!(bild.headers.get('content-type') ?? '').startsWith('image/jpeg')) {
        return json(res, 400, { error: { code: 36003, message: 'Only JPEG images are supported' } })
      }
      const id = `c${z.ig.length}`
      z.ig.push({
        konto: igMedia[1],
        behaelter: id,
        text: f.caption,
        bytes: (await bild.arrayBuffer()).byteLength,
        veroeffentlicht: false,
      })
      return json(res, 200, { id })
    }
    if (/^\/meta-graph\/c\d+$/.test(p)) return json(res, 200, { status_code: 'FINISHED', id: p.split('/').pop() })
    if (/^\/meta-graph\/200[23]\/media_publish$/.test(p)) {
      const b = z.ig.find((x) => x.behaelter === formular(roh).creation_id)
      if (!b) return json(res, 400, { error: { code: 100, message: 'creation_id' } })
      b.veroeffentlicht = true
      return json(res, 200, { id: `ig${b.behaelter}` })
    }
    if (/^\/meta-graph\/igc\d+$/.test(p))
      return json(res, 200, { permalink: `https://www.instagram.com/p/${p.split('/').pop()}/` })

    // --- LinkedIn -------------------------------------------------------------------------------------------
    if (p === '/linkedin-login/accessToken') {
      const f = formular(roh)
      if (f.grant_type === 'refresh_token') return json(res, 200, { access_token: neu('li'), expires_in: 5_184_000 })
      const c = z.codes.get(f.code)
      if (!c || c.dienst !== 'linkedin' || f.client_secret !== 'li-geheim')
        return json(res, 400, { error: 'invalid_grant' })
      z.codes.delete(f.code)
      return json(res, 200, { access_token: neu('li'), expires_in: 5_184_000, refresh_token: neu('li-refresh') })
    }
    if (p.startsWith('/linkedin/rest/') && req.headers['linkedin-version'] !== '202409') {
      return json(res, 426, { message: 'LinkedIn-Version fehlt' })
    }
    if (p.startsWith('/linkedin/') && z.abgelaufen.has(bearer(req))) return json(res, 401, { message: 'expired' })
    if (p === '/linkedin/rest/organizationAcls') {
      return json(res, 200, {
        elements: [
          { organization: 'urn:li:organization:777', role: 'ADMINISTRATOR' },
          { organization: 'urn:li:organization:778', role: 'ADMINISTRATOR' },
        ],
      })
    }
    if (p === '/linkedin/rest/organizations/777')
      return json(res, 200, { localizedName: 'Dimension Solaire Sàrl (Ersatz)' })
    if (p === '/linkedin/rest/organizations/778')
      return json(res, 200, { localizedName: 'Dimension Solaire GmbH (Ersatz)' })
    if (p === '/linkedin/rest/images' && q.get('action') === 'initializeUpload') {
      const id = `urn:li:image:${z.hochgeladen.length + 1}`
      return json(res, 200, {
        value: { uploadUrl: `http://${host}:${port}/linkedin/hoch/${z.hochgeladen.length + 1}`, image: id },
      })
    }
    if (p.startsWith('/linkedin/hoch/') && req.method === 'PUT') {
      z.hochgeladen.push({ urn: `urn:li:image:${p.split('/').pop()}`, bytes: roh.length })
      res.writeHead(201)
      return res.end()
    }
    if (p === '/linkedin/rest/posts' && req.method === 'POST') {
      const b = JSON.parse(roh.toString('utf8'))
      const id = `urn:li:share:${9000 + z.li.length}`
      z.li.push({ ...b, id })
      res.writeHead(201, { 'x-restli-id': id })
      return res.end()
    }

    // --- Canva ------------------------------------------------------------------------------------------------
    if (p === '/canva/oauth/token') {
      const f = formular(roh)
      if (req.headers.authorization !== `Basic ${Buffer.from('canva-app:canva-geheim').toString('base64')}`) {
        return json(res, 401, { error: 'invalid_client' })
      }
      if (f.grant_type === 'refresh_token') {
        return json(res, 200, { access_token: neu('canva'), refresh_token: neu('canva-r'), expires_in: 14400 })
      }
      const c = z.codes.get(f.code)
      const pkce = createHash('sha256')
        .update(f.code_verifier ?? '')
        .digest('base64url')
      if (!c || c.dienst !== 'canva' || c.challenge !== pkce) return json(res, 400, { error: 'invalid_grant' })
      z.codes.delete(f.code)
      return json(res, 200, { access_token: neu('canva'), refresh_token: neu('canva-r'), expires_in: 14400 })
    }
    if (p.startsWith('/canva/') && z.abgelaufen.has(bearer(req))) return json(res, 401, { message: 'expired' })
    if (p === '/canva/users/me/profile')
      return json(res, 200, { profile: { display_name: 'Dimension Solaire (Ersatz)' } })
    if (p === '/canva/designs' && req.method === 'POST') {
      const b = JSON.parse(roh.toString('utf8'))
      const id = `D${z.designs.length + 1}`
      z.designs.push({ id, ...b })
      return json(res, 200, {
        design: { id, title: b.title, urls: { edit_url: `https://www.canva.com/design/${id}/edit` } },
      })
    }
    if (p === '/canva/exports' && req.method === 'POST') {
      z.exporte.push(JSON.parse(roh.toString('utf8')))
      return json(res, 200, { job: { id: 'E1', status: 'in_progress' } })
    }
    if (p === '/canva/exports/E1') {
      return json(res, 200, { job: { id: 'E1', status: 'success', urls: [`http://${host}:${port}/canva/datei.jpg`] } })
    }
    if (p === '/canva/datei.jpg') {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' })
      return res.end(JPG)
    }

    json(res, 404, { message: `unbekannt: ${req.method} ${p}` })
  })

  return new Promise((ok) => {
    server.listen(port, '0.0.0.0', () => ok({ zustand: z, stopp: () => server.close() }))
  })
}
