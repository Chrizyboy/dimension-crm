// Edge Function «abaninja»: Kunde in AbaNinja suchen, verknüpfen, anlegen, aktualisieren, trennen und
// Rechnungen lesen (V139–V145). Phase 10: gestellte Rechnung als Entwurf übergeben und Abgleich lesen.
// Rechnungen nur mit Recht «finanzen». Versendet wird in AbaNinja nichts; das macht die Buchhaltung dort.

import * as aba from '../_shared/abaninja.ts'
import { dienst, gemessen } from '../_shared/datenbank.ts'
import { starte, textFeld } from '../_shared/funktion.ts'
import { DienstFehler } from '../_shared/http.ts'

interface KontaktZeile extends aba.CrmKunde {
  id: string
  abaninja_id: string | null
}

async function kontakt(id: string): Promise<KontaktZeile> {
  const [k] = await dienst.lies<KontaktZeile[]>(
    `kontakte?id=eq.${encodeURIComponent(id)}&geloescht_am=is.null&select=id,art,anrede,vorname,nachname,firma,email,telefon,sprache,kundennummer,abaninja_id`,
  )
  if (!k) throw new DienstFehler('nicht_gefunden', 404, 'Kontakt')
  // Adresse vom neuesten Objekt des Kunden (Kontakte selbst haben keine Adresse)
  const [o] = await dienst.lies<{ strasse: string | null; plz: string | null; ort: string | null }[]>(
    `objekte?kontakt_id=eq.${k.id}&geloescht_am=is.null&select=strasse,plz,ort&order=erstellt_am.desc&limit=1`,
  )
  return { ...k, ...(o ?? {}) }
}

async function anreden(): Promise<Record<string, string>> {
  const [z] = await dienst.lies<{ einstellungen: { anreden?: Record<string, string> } }[]>(
    'integrationen?dienst=eq.abaninja&select=einstellungen',
  )
  return z?.einstellungen.anreden ?? {}
}

const verknuepfe = (id: string, uuid: string | null) =>
  dienst.aendere(`kontakte?id=eq.${encodeURIComponent(id)}`, {
    abaninja_id: uuid,
    abaninja_abgeglichen_am: uuid ? new Date().toISOString() : null,
  })

starte({
  suchen: {
    recht: 'basis',
    f: async (e, ich) => ({
      kunden: await gemessen('abaninja', 'suchen', ich.id, () => aba.kundenSuchen(textFeld(e, 'begriff'))),
    }),
  },
  verknuepfen: {
    recht: 'basis',
    f: async (e, ich) => {
      const k = await kontakt(textFeld(e, 'kontakt_id'))
      const kunde = await gemessen('abaninja', 'lesen', ich.id, () => aba.kundeHolen(textFeld(e, 'uuid')))
      await verknuepfe(k.id, kunde.uuid)
      return { kunde }
    },
  },
  anlegen: {
    recht: 'basis',
    f: async (e, ich) => {
      const k = await kontakt(textFeld(e, 'kontakt_id'))
      if (k.abaninja_id) throw new DienstFehler('schon_verknuepft', 409, 'Schon verknüpft')
      const uuid = await gemessen('abaninja', 'anlegen', ich.id, async () =>
        aba.kundeAnlegen(aba.kundeFuerAbaninja(k, await anreden())),
      )
      await verknuepfe(k.id, uuid)
      return { uuid }
    },
  },
  aktualisieren: {
    recht: 'basis',
    f: async (e, ich) => {
      const k = await kontakt(textFeld(e, 'kontakt_id'))
      if (!k.abaninja_id) throw new DienstFehler('nicht_verknuepft', 409, 'Nicht verknüpft')
      await gemessen('abaninja', 'aktualisieren', ich.id, async () =>
        aba.kundeAktualisieren(k.abaninja_id!, aba.kundeFuerAbaninja(k, await anreden())),
      )
      await verknuepfe(k.id, k.abaninja_id)
      return {}
    },
  },
  trennen: {
    recht: 'basis',
    f: async (e) => {
      await verknuepfe(textFeld(e, 'kontakt_id'), null)
      return {}
    },
  },
  kunde: {
    recht: 'basis',
    f: async (e, ich) => {
      const k = await kontakt(textFeld(e, 'kontakt_id'))
      if (!k.abaninja_id) return { kunde: null }
      return { kunde: await gemessen('abaninja', 'lesen', ich.id, () => aba.kundeHolen(k.abaninja_id!)) }
    },
  },
  rechnung_uebergeben: {
    recht: 'finanzen',
    f: async (e, ich) => {
      const id = textFeld(e, 'rechnung_id')
      const [r] = await dienst.lies<
        (aba.CrmRechnung & { kontakt_id: string; status: string; abaninja_uuid: string | null })[]
      >(
        `rechnungen?id=eq.${encodeURIComponent(id)}&geloescht_am=is.null&select=nummer,titel,datum,faellig_am,inkl_mwst,mwst_satz,positionen,kontakt_id,status,abaninja_uuid`,
      )
      if (!r) throw new DienstFehler('nicht_gefunden', 404, 'Rechnung')
      if (r.status === 'entwurf' || r.status === 'storniert' || !r.nummer)
        throw new DienstFehler('nicht_gestellt', 409, 'Erst stellen')
      if (r.abaninja_uuid) throw new DienstFehler('schon_uebergeben', 409, 'Schon in AbaNinja')
      const k = await kontakt(r.kontakt_id)
      if (!k.abaninja_id) throw new DienstFehler('nicht_verknuepft', 409, 'Kunde nicht in AbaNinja')
      const uuid = await gemessen('abaninja', 'rechnung', ich.id, async () => {
        const kunde = await aba.kundeHolen(k.abaninja_id!)
        if (!kunde.kundennummer) throw new DienstFehler('abaninja_daten', 422, 'Kunde ohne Kundennummer')
        return aba.rechnungAnlegen(aba.rechnungFuerAbaninja(r, kunde.kundennummer))
      })
      // Ohne UUID (Warteschlange) findet der nächste Abgleich die Rechnung über die Referenz.
      await dienst.aendere(`rechnungen?id=eq.${encodeURIComponent(id)}`, {
        abaninja_uuid: uuid,
        abaninja_status: uuid ? 'draft' : 'warteschlange',
        abaninja_abgeglichen_am: new Date().toISOString(),
      })
      return { uuid }
    },
  },
  // Liest Rechnungen und Lieferantenrechnungen; die App wendet sie mit dem eigenen Login an
  // (abaninja_abgleich_anwenden), damit die Rechte der Person gelten.
  abgleich: {
    recht: 'finanzen',
    f: async (e, ich) => {
      const seit = typeof e.seit === 'string' && e.seit ? e.seit : undefined
      return await gemessen('abaninja', 'abgleich', ich.id, () => aba.abgleichDaten(seit))
    },
  },
  rechnungen: {
    recht: 'finanzen',
    f: async (e, ich) => {
      const k = await kontakt(textFeld(e, 'kontakt_id'))
      if (!k.abaninja_id) return { rechnungen: [] }
      return { rechnungen: await gemessen('abaninja', 'rechnungen', ich.id, () => aba.rechnungen(k.abaninja_id!)) }
    },
  },
})
