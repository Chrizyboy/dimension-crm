// Canva (Connect API): leeres Design im richtigen Format anlegen und das fertige Bild als JPG ins CRM holen.
// Gestaltet wird in Canva selbst mit dem Markenkit «Dimension Solaire» (V233: Bild über Canva).

import { dienst } from './datenbank.ts'
import { DienstFehler, leseJson, rufe } from './http.ts'
import { canvaBasis, socialUngueltig, socialZugang } from './social_konten.ts'

/** Formate wie V233: Quadrat, Hochformat, Story, Querformat (LinkedIn). */
export const FORMATE: Record<string, { breite: number; hoehe: number }> = {
  quadrat: { breite: 1080, hoehe: 1080 },
  hoch: { breite: 1080, hoehe: 1350 },
  story: { breite: 1080, hoehe: 1920 },
  quer: { breite: 1200, hoehe: 627 },
}

async function canva<T>(pfad: string, o: { methode?: 'GET' | 'POST'; inhalt?: unknown } = {}): Promise<T> {
  const { token } = await socialZugang('canva')
  const res = await rufe(
    `${canvaBasis()}${pfad}`,
    {
      method: o.methode ?? 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(o.inhalt ? { 'Content-Type': 'application/json' } : {}) },
      ...(o.inhalt ? { body: JSON.stringify(o.inhalt) } : {}),
    },
    { versuche: o.methode === 'POST' ? 1 : 2 },
  )
  const daten = await leseJson<T & { message?: string }>(res)
  if (res.status === 401) {
    await socialUngueltig('canva')
    throw new DienstFehler('neu_verbinden', 401, 'Canva')
  }
  if (!res.ok || !daten) throw new DienstFehler('canva', res.status, daten?.message?.slice(0, 120) ?? 'Canva')
  return daten
}

/** Neues leeres Design; gibt ID und Adresse zum Bearbeiten in Canva zurück. */
export async function canvaNeu(format: string, titel: string): Promise<{ id: string; adresse: string }> {
  const f = FORMATE[format] ?? FORMATE.quadrat!
  const r = await canva<{ design: { id: string; urls: { edit_url: string } } }>('/designs', {
    methode: 'POST',
    inhalt: {
      design_type: { type: 'custom', width: f.breite, height: f.hoehe },
      title: titel.slice(0, 255) || 'Dimension Solaire',
    },
  })
  return { id: r.design.id, adresse: r.design.urls.edit_url }
}

/**
 * Design als JPG exportieren (Instagram nimmt nur JPEG), in die Ablage legen (Ordner «marketing») und als Dokument
 * eintragen.
 */
export async function canvaHolen(postId: string, designId: string, wer: string): Promise<string> {
  const job = await canva<{ job: { id: string } }>('/exports', {
    methode: 'POST',
    inhalt: { design_id: designId, format: { type: 'jpg', quality: 90 } },
  })
  let urls: string[] = []
  for (let i = 0; i < 20 && !urls.length; i++) {
    const s = await canva<{ job: { status: string; urls?: string[] } }>(`/exports/${job.job.id}`)
    if (s.job.status === 'failed') throw new DienstFehler('canva_export', 502, 'Export fehlgeschlagen')
    if (s.job.status === 'success') urls = s.job.urls ?? []
    else await new Promise((r) => setTimeout(r, 1000))
  }
  if (!urls[0]) throw new DienstFehler('zeitlimit', 0, 'Export dauert zu lange')
  const res = await rufe(urls[0], {}, { zeitlimitMs: 30_000 })
  if (!res.ok) throw new DienstFehler('canva_export', res.status, 'Bild nicht erhalten')
  const bytes = new Uint8Array(await res.arrayBuffer())
  const pfad = `marketing/${postId}/${String(Date.now())}-canva.jpg`
  await dienst.hochladen('dokumente', pfad, bytes, 'image/jpeg')
  const id = crypto.randomUUID()
  await dienst.schreibe('dokumente', {
    id,
    name: 'Canva.jpg',
    mime_typ: 'image/jpeg',
    bytes: bytes.length,
    ordner: 'marketing',
    speicher: 'intern',
    speicher_pfad: pfad,
    bezug_tabelle: 'social_posts',
    bezug_id: postId,
    hochgeladen_von: `${wer} (Canva)`,
  })
  return id
}
