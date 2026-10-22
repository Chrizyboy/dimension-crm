// Edge Function «abaninja»: Kunde in AbaNinja suchen, verknüpfen, anlegen, aktualisieren, trennen und
// Rechnungen lesen (V139–V145). Rechnungen sehen nur Personen mit Recht «finanzen».

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
  rechnungen: {
    recht: 'finanzen',
    f: async (e, ich) => {
      const k = await kontakt(textFeld(e, 'kontakt_id'))
      if (!k.abaninja_id) return { rechnungen: [] }
      return { rechnungen: await gemessen('abaninja', 'rechnungen', ich.id, () => aba.rechnungen(k.abaninja_id!)) }
    },
  },
})
