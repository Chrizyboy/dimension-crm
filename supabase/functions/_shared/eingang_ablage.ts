// Eingangsrechnungen in Compta ablegen (Chris 27.11.2026): SharePoint-Bibliothek «Administration», Ordner
// «Compta/factures <Jahr>» (Jahr der Leistungsperiode). Ändert sich Name oder Jahr später (Korrektur beim Prüfen),
// wird die Datei umbenannt bzw. verschoben, nicht doppelt abgelegt. Läuft im Zeitplan; was offen ist, sagt die
// Datenbank (eingang_ablage_offen).

import { dienst } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { graph } from './microsoft.ts'
import type { MsEinstellungen } from './abgleich.ts'
import { ablageEinstellung, ablagePerson, pfadSicher } from './ablage.ts'
import { hochladen, laufwerkId } from './sharepoint.ts'

interface Offen {
  id: string
  speicher_pfad: string
  dateiname: string
  jahr: number
  item_id: string | null
}

/** Ordner für ein Jahr aus der Vorlage «Compta/factures {jahr}». */
export function comptaOrdner(vorlage: string | undefined, jahr: number): string {
  return (vorlage?.trim() || 'Compta/factures {jahr}').replaceAll('{jahr}', String(jahr)).replace(/^\/+|\/+$/g, '')
}

/** Ein Lauf; Meldung für das Zeitplan-Protokoll. */
export async function eingangAblegen(s: MsEinstellungen, limit = 10): Promise<string> {
  const offen = await dienst.rpc<Offen[]>('eingang_ablage_offen', { p_limit: limit })
  if (!offen.length) return 'nichts offen'
  const [f] = await dienst.lies<{ wert: { eingang?: { ablage?: { bibliothek?: string; ordner?: string } } } }[]>(
    'einstellungen?schluessel=eq.finanzen&select=wert',
  )
  const cfg = f?.wert.eingang?.ablage ?? {}
  const personId = await ablagePerson({ person: (await ablageEinstellung())?.person })
  if (!personId) return 'keine verbundene Person'
  const laufwerk = await laufwerkId(personId, { ...s, sharepoint_bibliothek: cfg.bibliothek ?? 'Administration' })
  const cache = new Map<string, { id: string; webUrl: string }>()
  let ok = 0
  for (const o of offen) {
    const ordner = comptaOrdner(cfg.ordner, o.jahr)
    try {
      let r: { id: string; url: string }
      if (o.item_id) {
        const eltern = await pfadSicher(personId, laufwerk, ordner, cache)
        const x = await graph<{ id: string; webUrl: string }>(personId, `/drives/${laufwerk}/items/${o.item_id}`, {
          methode: 'PATCH',
          inhalt: { name: o.dateiname, parentReference: { id: eltern.id } },
        })
        r = { id: x.id, url: x.webUrl }
      } else {
        await pfadSicher(personId, laufwerk, ordner, cache)
        const bytes = await dienst.datei('dokumente', o.speicher_pfad)
        r = await hochladen(personId, laufwerk, `${ordner}/${o.dateiname}`, bytes)
      }
      await dienst.rpc('eingang_ablage_ergebnis', {
        p_id: o.id,
        p_ok: true,
        p_item: r.id,
        p_url: r.url,
        p_name: o.dateiname,
        p_jahr: o.jahr,
        p_fehler: null,
      })
      ok++
    } catch (e) {
      const code = e instanceof DienstFehler ? (e.status === 409 ? 'name_belegt' : e.code) : 'fehler'
      await dienst.rpc('eingang_ablage_ergebnis', {
        p_id: o.id,
        p_ok: false,
        p_item: null,
        p_url: null,
        p_name: null,
        p_jahr: null,
        p_fehler: code,
      })
    }
  }
  return `${ok} von ${offen.length} Rechnungen in Compta`
}
