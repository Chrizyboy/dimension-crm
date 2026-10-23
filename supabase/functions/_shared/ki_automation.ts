// KI-Entwürfe für Automationen (Phase 13): Der Zeitplan holt Mails aus dem Ausgangskorb, deren Text die KI schreiben
// soll (ki_status «wartet»), schreibt sie im Stil der Firma und der absendenden Person und setzt sie ein – nur solange
// niemand den Vorlagentext geändert hat. Fehlt der Schlüssel oder ist das Limit erreicht, bleibt der Vorlagentext.

import { dienst } from './datenbank.ts'
import { DienstFehler } from './http.ts'
import { kiAufruf, kiEinstellung, persoenlicherStil } from './ki_rahmen.ts'
import { kurz } from './ki_schema.ts'
import { ENTWURF_SCHEMA, entwurfTeile, KUNDEN_TEXTE, systemKundentext } from './ki_texte.ts'

interface Offen {
  id: string
  auftrag: { art?: string; tabelle?: string; bezug_id?: string; wunsch?: string | null; person_id?: string | null }
  betreff: string | null
  text: string | null
  sprache: 'de' | 'fr'
  absender_person_id: string | null
}

/** Arbeitet bis zu `limit` KI-Entwürfe ab; gibt eine kurze Meldung für das Zeitplan-Protokoll zurück. */
export async function kiEntwuerfeAbarbeiten(limit = 3): Promise<string> {
  const offen = await dienst.rpc<Offen[]>('ki_entwuerfe_offen', { p_limit: limit })
  if (!offen.length) return '0 Entwürfe'
  const cfg = await kiEinstellung()
  let fertig = 0
  let fehler = 0
  for (const o of offen) {
    try {
      const personId = o.absender_person_id ?? o.auftrag.person_id ?? null
      const [p] = personId
        ? await dienst.lies<{ id: string; name: string }[]>(`personen?id=eq.${personId}&select=id,name`)
        : []
      const kontext =
        o.auftrag.tabelle && o.auftrag.bezug_id
          ? await dienst.rpc('ki_kontext', { p_tabelle: o.auftrag.tabelle, p_id: o.auftrag.bezug_id })
          : null
      const art = o.auftrag.art && o.auftrag.art in KUNDEN_TEXTE ? o.auftrag.art : 'frei'
      const r = await kiAufruf(
        {
          funktion: 'automation',
          personId: p?.id ?? null,
          bezugTabelle: o.auftrag.tabelle,
          bezugId: o.auftrag.bezug_id,
        },
        cfg,
        {
          system: systemKundentext(
            o.sprache,
            p?.name ?? '',
            cfg.stil[o.sprache],
            p ? await persoenlicherStil(p.id, p.name) : '',
          ),
          teile: entwurfTeile(
            {
              art,
              sprache: o.sprache,
              vorlage: o.text ?? '',
              ...(o.auftrag.wunsch ? { wunsch: o.auftrag.wunsch } : {}),
            },
            kontext,
          ),
          schema: ENTWURF_SCHEMA,
          maxTokens: 5000,
          aufwand: 'medium',
        },
      )
      const j = r.json as { betreff: string; text: string }
      await dienst.rpc('ki_entwurf_einsetzen', {
        p_id: o.id,
        p_ok: true,
        p_betreff: kurz(j.betreff, 300),
        p_text: kurz(j.text, 12_000),
        p_vorher: o.text,
        p_meldung: null,
      })
      fertig++
    } catch (f) {
      fehler++
      await dienst.rpc('ki_entwurf_einsetzen', {
        p_id: o.id,
        p_ok: false,
        p_betreff: null,
        p_text: null,
        p_vorher: o.text,
        p_meldung: f instanceof DienstFehler ? f.code : 'fehler',
      })
    }
  }
  return `${fertig} Entwürfe, ${fehler} Fehler`
}
