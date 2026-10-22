// Kundendateien in SharePoint sichern (V62/V64): Website «Dimension-Solaire», Bibliothek «Administration»,
// Ordner «Direction Interne/CRM Backups/Kunden Backup/<K0123 Name>/<Ordner der Vorlage>». Anders als V233
// (höchstens 1 MB über den Connector) gehen hier auch grosse Dateien, über eine Upload-Sitzung.

import { dienst } from './datenbank.ts'
import { DienstFehler, rufe, type Bytes } from './http.ts'
import { graph } from './microsoft.ts'
import type { MsEinstellungen } from './abgleich.ts'

/** Die Ordner der Vorlage (V233 DOS_FOLDERS), Name in SharePoint zweisprachig wie bisher. */
export const ORDNER: Record<string, string> = {
  kundenblatt: 'FICHE CLIENT - KUNDENBLATT',
  werkvertrag: 'CONTRAT - WERKVERTRAG',
  korrespondenz: 'CORRESPONDANCE - KORRESPONDENZ',
  selbstkosten: 'COÛT DE REVIENT - SELBSTKOSTEN',
  angebot: 'DEVIS - ANGEBOT',
  rechnungen: 'FACTURES - RECHNUNGEN',
  lieferanten: 'FOURNISSEURS ET PARTENAIRES - LIEFERANTEN UND PARTNER',
  bewilligungen: 'PERMIS ET SUBVENTION - GENEHMIGUNGEN UND FÖRDERUNG',
  bilder: 'PHOTOS - BILDER',
  plaene: 'PLANS - PLÄNE',
  sav: 'SAV - AFTERSALES',
}

/** Zeichen, die SharePoint in Namen nicht erlaubt, ersetzen (wie V233 kbName). */
export function sichererName(s: string): string {
  return s
    .replace(/[\\/:*?"<>|#%]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 120)
}

/** Kundenordner «K0123 Anna Muster» (V233 kbKey/kbName). */
export function kundenordner(kundennummer: number | null, name: string, ersatz: string): string {
  const kennung = kundennummer ? `K${String(kundennummer).padStart(4, '0')}` : ersatz.slice(0, 8)
  return sichererName(`${kennung} ${name}`)
}

/** Pfad einer Datei in der Bibliothek. */
export function dateipfad(s: MsEinstellungen, ordner: string, unterordner: string | null, datei: string): string {
  const teile = [
    s.sharepoint_ordner ?? 'Direction Interne/CRM Backups/Kunden Backup',
    ordner,
    ORDNER[unterordner ?? ''] ?? 'DIVERS - DIVERSES',
    sichererName(datei) || 'Datei',
  ]
  return teile.join('/')
}

const kodiert = (pfad: string) => pfad.split('/').map(encodeURIComponent).join('/')

// Laufwerk (Bibliothek) einmal pro Aufruf suchen.
let laufwerk: { schluessel: string; id: string } | null = null

/** ID der Bibliothek (z. B. «Administration») auf der Website. */
export async function laufwerkId(personId: string, s: MsEinstellungen): Promise<string> {
  const website = s.sharepoint_website ?? 'dimensionsolaire.sharepoint.com:/sites/Dimension-Solaire'
  const name = s.sharepoint_bibliothek ?? 'Administration'
  const schluessel = `${website}|${name}`
  if (laufwerk?.schluessel === schluessel) return laufwerk.id
  const site = await graph<{ id: string }>(personId, `/sites/${website}`)
  const liste = await graph<{ value: { id: string; name: string }[] }>(
    personId,
    `/sites/${site.id}/drives?$select=id,name`,
  )
  const d = liste.value.find((x) => x.name.toLowerCase() === name.toLowerCase())
  if (!d) throw new DienstFehler('bibliothek_fehlt', 404, 'Bibliothek nicht gefunden')
  laufwerk = { schluessel, id: d.id }
  return d.id
}

/** Datei hochladen (vorhandene gleichnamige Datei wird ersetzt, SharePoint behält die alte Version). */
export async function hochladen(
  personId: string,
  laufwerkId: string,
  pfad: string,
  bytes: Bytes,
): Promise<{ url: string; id: string }> {
  if (bytes.length <= 4 * 1024 * 1024) {
    return graph<{ webUrl: string; id: string }>(personId, `/drives/${laufwerkId}/root:/${kodiert(pfad)}:/content`, {
      methode: 'PUT',
      koepfe: { 'Content-Type': 'application/octet-stream' },
      roh: bytes,
    }).then((r) => ({ url: r.webUrl, id: r.id }))
  }
  const s = await graph<{ uploadUrl: string }>(
    personId,
    `/drives/${laufwerkId}/root:/${kodiert(pfad)}:/createUploadSession`,
    {
      methode: 'POST',
      inhalt: { item: { '@microsoft.graph.conflictBehavior': 'replace' } },
    },
  )
  const stueck = 320 * 1024 * 16
  let letzte: { webUrl?: string; id?: string } = {}
  for (let von = 0; von < bytes.length; von += stueck) {
    const teil = bytes.subarray(von, Math.min(bytes.length, von + stueck))
    const res = await rufe(
      s.uploadUrl,
      {
        method: 'PUT',
        headers: { 'Content-Range': `bytes ${von}-${von + teil.length - 1}/${bytes.length}` },
        body: teil,
      },
      { versuche: 2, zeitlimitMs: 60_000 },
    )
    if (!res.ok) throw new DienstFehler('upload', res.status, 'Upload')
    letzte = (await res.json().catch(() => ({}))) as typeof letzte
  }
  return { url: letzte.webUrl ?? '', id: letzte.id ?? '' }
}

/** Dokument (im CRM gespeichert) mit Kunde für die Sicherung. */
export interface SicherungsDokument {
  id: string
  name: string
  ordner: string | null
  speicher_pfad: string
  kundennummer: number | null
  kunde: string
  kontakt_id: string
}

/** Ein Dokument sichern und den Stand am Dokument festhalten. */
export async function dokumentSichern(personId: string, s: MsEinstellungen, d: SicherungsDokument): Promise<boolean> {
  const pfad = dateipfad(s, kundenordner(d.kundennummer, d.kunde, d.kontakt_id), d.ordner, d.name)
  try {
    const bytes = await dienst.datei('dokumente', d.speicher_pfad)
    const r = await hochladen(personId, await laufwerkId(personId, s), pfad, bytes)
    await dienst.aendere(`dokumente?id=eq.${d.id}`, {
      sharepoint_url: r.url,
      sharepoint_pfad: pfad,
      sharepoint_status: { ok: true, fehler: '', gesichert_am: new Date().toISOString() },
    })
    return true
  } catch (f) {
    await dienst.aendere(`dokumente?id=eq.${d.id}`, {
      sharepoint_status: {
        ok: false,
        fehler: f instanceof DienstFehler ? f.code : 'fehler',
        versucht_am: new Date().toISOString(),
      },
    })
    return false
  }
}
