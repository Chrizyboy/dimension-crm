// Versand aus dem Ausgangskorb: nur freigegebene Einträge (von einem Menschen oder von einer Automation, die
// ausdrücklich auf «automatisch» steht, Regel 6). Mails gehen aus dem Outlook der absendenden Person
// (landen dort in «Gesendete Elemente»), SMS über ASPSMS. Ergebnis und Kundenverlauf schreibt die Datenbank.

import { dienst } from './datenbank.ts'
import { graph, graphBasis, zugang } from './microsoft.ts'
import { ANHAENGE_GESAMT_MAX, ANHANG_DIREKT_MAX, base64, mailZuOutlook } from './outlook.ts'
import { smsSenden } from './aspsms.ts'
import { eingerichtet } from './umgebung.ts'
import { DienstFehler, rufe, type Bytes } from './http.ts'

/** Ein Eintrag aus ausgang_holen (Ausschnitt). */
interface Ausgang {
  id: string
  kanal: 'mail' | 'sms'
  an: string
  cc: string | null
  betreff: string | null
  html: string | null
  text: string | null
  anhaenge: { dokument_id: string; name?: string }[] | null
  absender_person_id: string | null
  freigegeben_von: string | null
}

/** Dokument für einen Anhang. */
interface Dokument {
  id: string
  name: string
  mime_typ: string | null
  speicher: string
  speicher_pfad: string | null
  sharepoint_url: string | null
}

/** Freigabe-Link von SharePoint → Graph «shares»-Kennung (u!base64url). */
export function freigabeKennung(url: string): string {
  const b = btoa(String.fromCharCode(...new TextEncoder().encode(url)))
  return `u!${b.replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-')}`
}

async function dateiLesen(personId: string, d: Dokument): Promise<Bytes> {
  if (d.speicher_pfad && d.speicher !== 'sharepoint') return dienst.datei('dokumente', d.speicher_pfad)
  if (!d.sharepoint_url) throw new DienstFehler('anhang_fehlt', 404, 'Anhang ohne Datei')
  const res = await rufe(`${graphBasis()}/shares/${freigabeKennung(d.sharepoint_url)}/driveItem/content`, {
    headers: { Authorization: `Bearer ${await zugang(personId)}` },
  })
  if (!res.ok) throw new DienstFehler('anhang_fehlt', res.status, 'Anhang nicht lesbar')
  return new Uint8Array(await res.arrayBuffer())
}

/** Grosse Datei über eine Upload-Sitzung an den Entwurf hängen (Stücke à 3,75 MB, Vielfaches von 320 KB). */
async function grossAnhaengen(personId: string, entwurf: string, name: string, bytes: Bytes) {
  const s = await graph<{ uploadUrl: string }>(personId, `/me/messages/${entwurf}/attachments/createUploadSession`, {
    methode: 'POST',
    inhalt: { AttachmentItem: { attachmentType: 'file', name, size: bytes.length } },
  })
  const stueck = 320 * 1024 * 12
  for (let von = 0; von < bytes.length; von += stueck) {
    const teil = bytes.subarray(von, Math.min(bytes.length, von + stueck))
    const res = await rufe(
      s.uploadUrl,
      {
        method: 'PUT',
        headers: { 'Content-Range': `bytes ${von}-${von + teil.length - 1}/${bytes.length}` },
        body: teil,
      },
      { versuche: 2, zeitlimitMs: 30_000 },
    )
    if (!res.ok) throw new DienstFehler('anhang', res.status, 'Upload')
    await res.body?.cancel()
  }
}

/**
 * Mail aus dem Outlook der Person senden: Entwurf anlegen, Anhänge dazu, senden. Gibt die
 * internetMessageId zurück (damit der Mail-Abgleich dieselbe Mail nicht noch einmal vermerkt).
 */
export async function mailSenden(personId: string, a: Ausgang): Promise<string> {
  const entwurf = await graph<{ id: string; internetMessageId?: string }>(personId, '/me/messages', {
    methode: 'POST',
    inhalt: mailZuOutlook(a),
    koepfe: { Prefer: 'IdType="ImmutableId"' },
  })
  try {
    const ids = (a.anhaenge ?? []).map((x) => x.dokument_id)
    if (ids.length) {
      const docs = await dienst.lies<Dokument[]>(
        `dokumente?id=in.(${ids.join(',')})&geloescht_am=is.null&select=id,name,mime_typ,speicher,speicher_pfad,sharepoint_url`,
      )
      let gesamt = 0
      for (const d of docs) {
        const bytes = await dateiLesen(personId, d)
        gesamt += bytes.length
        if (gesamt > ANHAENGE_GESAMT_MAX) throw new DienstFehler('anhang_zu_gross', 413, 'Anhänge zu gross')
        if (bytes.length <= ANHANG_DIREKT_MAX) {
          await graph(personId, `/me/messages/${entwurf.id}/attachments`, {
            methode: 'POST',
            inhalt: {
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: d.name,
              contentType: d.mime_typ ?? 'application/octet-stream',
              contentBytes: base64(bytes),
            },
          })
        } else await grossAnhaengen(personId, entwurf.id, d.name, bytes)
      }
    }
    await graph(personId, `/me/messages/${entwurf.id}/send`, { methode: 'POST' })
  } catch (f) {
    // Entwurf nicht liegen lassen; scheitert auch das, bleibt er in «Entwürfe» (harmlos, nichts ging raus).
    await graph(personId, `/me/messages/${entwurf.id}`, { methode: 'DELETE' }).catch(() => undefined)
    throw f
  }
  return entwurf.internetMessageId ?? entwurf.id
}

/** Fehler → kurzer Schlüssel für die App. Nach einem Zeitlimit beim Senden ist offen, ob es raus ist. */
export function versandFehler(f: unknown): string {
  if (f instanceof DienstFehler) return f.code === 'zeitlimit' || f.code === 'netzwerk' ? 'ausgang.unklar' : f.code
  const m = f instanceof Error ? f.message : ''
  return m.startsWith('konfiguration:') ? 'nicht_eingerichtet' : 'intern'
}

/** Freigegebene Einträge senden (höchstens limit). Gibt zurück, wie viele raus sind und wie viele scheiterten. */
export async function ausgangAbarbeiten(limit = 10): Promise<{ gesendet: number; fehler: number }> {
  const zeilen = await dienst.rpc<Ausgang[]>('ausgang_holen', { p_limit: limit })
  const ein = eingerichtet()
  const [sms] = await dienst.lies<{ einstellungen: { absender?: string } }[]>(
    'integrationen?dienst=eq.sms&select=einstellungen',
  )
  let gesendet = 0
  let fehler = 0
  for (const a of zeilen) {
    const start = Date.now()
    let ok = false
    let meldung: string | null = null
    let extern: string | null = null
    try {
      if (a.kanal === 'sms') {
        if (!ein.sms) throw new Error('konfiguration:ASPSMS_USERKEY')
        await smsSenden(a.an, a.text ?? '', sms?.einstellungen.absender ?? 'DimSolaire')
      } else {
        const person = a.absender_person_id ?? a.freigegeben_von
        if (!person) throw new DienstFehler('ausgang.kein_absender', 400, 'Kein Absender')
        if (!ein.microsoft) throw new Error('konfiguration:MS_CLIENT_ID')
        extern = await mailSenden(person, a)
      }
      ok = true
      gesendet++
    } catch (f) {
      meldung = versandFehler(f)
      fehler++
    }
    await dienst.rpc('ausgang_ergebnis', { p_id: a.id, p_ok: ok, p_meldung: meldung, p_extern_id: extern })
    await dienst
      .schreibe('integrations_protokoll', {
        dienst: a.kanal === 'sms' ? 'sms' : 'microsoft',
        aktion: 'senden',
        ok,
        dauer_ms: Date.now() - start,
        meldung,
        person_id: a.absender_person_id,
      })
      .catch(() => undefined)
  }
  return { gesendet, fehler }
}
