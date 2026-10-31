// Automatische Dateiablage in SharePoint (Entscheid 0030): Ordner einer Offerte anlegen (mit Unterordnern),
// bei Annahme zu den Aufträgen und bei Verlust ins Archiv verschieben, Dateien aus dem CRM einordnen.
// Läuft im Zeitplan mit der Microsoft-Verbindung einer Person; was zu tun ist, sagt die Datenbank.

import { dienst } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { graph } from './microsoft.ts'
import type { MsEinstellungen } from './abgleich.ts'
import { elternPfad, ordnerName, unterordnerFuer, type AblageEinstellung, type OffenerOrdner } from './ablage_pfade.ts'
import { hochladen, laufwerkId, sichererName } from './sharepoint.ts'

interface Eintrag {
  id: string
  webUrl: string
}

const kodiert = (pfad: string) => pfad.split('/').map(encodeURIComponent).join('/')
const besetzt = (f: unknown) => f instanceof DienstFehler && f.status === 409

/** Einstellung «ablage» lesen; null, wenn sie aus ist. */
export async function ablageEinstellung(): Promise<AblageEinstellung | null> {
  const [z] = await dienst.lies<{ wert: AblageEinstellung }[]>('einstellungen?schluessel=eq.ablage&select=wert')
  return z?.wert.aktiv ? z.wert : null
}

/** Ordner unter einem Elternordner anlegen; gibt es ihn schon, wird der vorhandene genommen. */
async function ordnerSicher(personId: string, laufwerk: string, elternId: string, elternPfad: string, name: string) {
  try {
    return await graph<Eintrag>(personId, `/drives/${laufwerk}/items/${elternId}/children`, {
      methode: 'POST',
      inhalt: { name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' },
    })
  } catch (f) {
    if (!besetzt(f)) throw f
    const pfad = elternPfad ? `${elternPfad}/${name}` : name
    return graph<Eintrag>(personId, `/drives/${laufwerk}/root:/${kodiert(pfad)}?$select=id,webUrl`)
  }
}

/** Ganzen Pfad sicherstellen (fehlende Ordner wie «A 2027» legt er an). Merkt sich Gefundenes pro Lauf. */
async function pfadSicher(personId: string, laufwerk: string, pfad: string, cache: Map<string, Eintrag>) {
  let eltern = cache.get('') ?? (await graph<Eintrag>(personId, `/drives/${laufwerk}/root?$select=id,webUrl`))
  cache.set('', eltern)
  let bisher = ''
  for (const teil of pfad.split('/').filter(Boolean)) {
    const hier = bisher ? `${bisher}/${teil}` : teil
    let e = cache.get(hier)
    if (!e) {
      try {
        e = await graph<Eintrag>(personId, `/drives/${laufwerk}/root:/${kodiert(hier)}?$select=id,webUrl`)
      } catch (f) {
        if (!(f instanceof DienstFehler && f.status === 404)) throw f
        e = await ordnerSicher(personId, laufwerk, eltern.id, bisher, teil)
      }
      cache.set(hier, e)
    }
    eltern = e
    bisher = hier
  }
  return eltern
}

/** Einen Ordner anlegen oder verschieben und das Ergebnis in die Datenbank schreiben. */
async function ordnerBearbeiten(
  personId: string,
  laufwerk: string,
  e: AblageEinstellung,
  o: OffenerOrdner,
  cache: Map<string, Eintrag>,
): Promise<boolean> {
  try {
    const elternPfadText = elternPfad(e, o)
    const name = ordnerName(e, o)
    const eltern = await pfadSicher(personId, laufwerk, elternPfadText, cache)
    let ordner: Eintrag
    if (!o.item_id) {
      ordner = await ordnerSicher(personId, laufwerk, eltern.id, elternPfadText, name)
      for (const u of Object.values(e.unterordner)) {
        await ordnerSicher(personId, laufwerk, ordner.id, `${elternPfadText}/${name}`, sichererName(u))
      }
    } else {
      // Verschieben über die ID: Der Name bleibt, auch wenn jemand ihn in SharePoint angepasst hat.
      ordner = await graph<Eintrag>(personId, `/drives/${laufwerk}/items/${o.item_id}?$select=id,webUrl`, {
        methode: 'PATCH',
        inhalt: { parentReference: { id: eltern.id } },
      })
    }
    const nameJetzt = decodeURIComponent(ordner.webUrl.split('/').at(-1) ?? name)
    await dienst.rpc('ablage_ergebnis', {
      p_id: o.id,
      p_ok: true,
      p_stand: o.soll,
      p_pfad: `${elternPfadText}/${nameJetzt}`,
      p_item: ordner.id,
      p_url: ordner.webUrl,
    })
    return true
  } catch (f) {
    const code = besetzt(f) ? 'ziel_belegt' : f instanceof DienstFehler ? f.code : 'fehler'
    await dienst.rpc('ablage_ergebnis', { p_id: o.id, p_ok: false, p_fehler: code })
    return false
  }
}

/** Datei aus dem CRM in den Ordner (und Unterordner) laden und am Dokument vermerken. */
async function dateiAblegen(
  personId: string,
  laufwerk: string,
  e: AblageEinstellung,
  d: { id: string; name: string; ordner: string | null; speicher_pfad: string; ablage_pfad: string },
): Promise<boolean> {
  const unter = unterordnerFuer(e, d.ordner)
  const pfad = [d.ablage_pfad, unter ? sichererName(unter) : null, sichererName(d.name) || 'Datei']
    .filter(Boolean)
    .join('/')
  try {
    const bytes = await dienst.datei('dokumente', d.speicher_pfad)
    const r = await hochladen(personId, laufwerk, pfad, bytes)
    await dienst.aendere(`dokumente?id=eq.${d.id}`, {
      sharepoint_url: r.url,
      sharepoint_pfad: pfad,
      sharepoint_status: { ok: true, ablage: true, fehler: '', gesichert_am: new Date().toISOString() },
    })
    return true
  } catch (f) {
    await dienst.aendere(`dokumente?id=eq.${d.id}`, {
      sharepoint_status: {
        ok: false,
        ablage: false,
        fehler: f instanceof DienstFehler ? f.code : 'fehler',
        versucht_am: new Date().toISOString(),
      },
    })
    return false
  }
}

/** Person für die Ablage: die eingestellte (Kürzel), wenn sie mit Microsoft verbunden ist, sonst die erste verbundene. */
async function ablagePerson(e: AblageEinstellung): Promise<string | null> {
  const verbundene = (await dienst.rpc<{ person_id: string }[]>('ms_verbundene', {})).map((p) => p.person_id)
  if (e.person) {
    const [p] = await dienst.lies<{ id: string }[]>(
      `personen?kuerzel=eq.${encodeURIComponent(e.person)}&aktiv=is.true&select=id`,
    )
    if (p && verbundene.includes(p.id)) return p.id
  }
  return verbundene[0] ?? null
}

/** Ein Lauf: erst Ordner anlegen/verschieben, dann Dateien einordnen. Meldung für das Zeitplan-Protokoll. */
export async function ablageAbarbeiten(s: MsEinstellungen, limit = 10): Promise<string> {
  const e = await ablageEinstellung()
  if (!e) return 'aus'
  if (e.aktiv_seit && Date.parse(e.aktiv_seit) > Date.now()) return `ab ${e.aktiv_seit.slice(0, 10)}`
  const personId = await ablagePerson(e)
  if (!personId) return 'keine verbundene Person'
  const laufwerk = await laufwerkId(personId, { ...s, sharepoint_bibliothek: e.bibliothek ?? 'Public' })
  const cache = new Map<string, Eintrag>()
  const offen = await dienst.rpc<OffenerOrdner[]>('ablage_offen', { p_limit: limit })
  let ordner = 0
  for (const o of offen) if (await ordnerBearbeiten(personId, laufwerk, e, o, cache)) ordner++
  const dateien = await dienst.rpc<Parameters<typeof dateiAblegen>[3][]>('ablage_dateien_offen', { p_limit: limit })
  let abgelegt = 0
  for (const d of dateien) if (await dateiAblegen(personId, laufwerk, e, d)) abgelegt++
  return `${ordner} von ${offen.length} Ordnern, ${abgelegt} von ${dateien.length} Dateien`
}
