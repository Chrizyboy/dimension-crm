import type { Einsatz } from '../types'

/** Pflicht-Ausweise einer Tätigkeit (Auswahlliste «taetigkeit», gepflegt unter Team & Ausweise › Anforderungen). */
export interface TaetigkeitPflicht {
  schluessel: string
  ausweise: string[]
  /** «alle» = jede Person im Einsatz, «einer» = mindestens eine. */
  wer: 'alle' | 'einer'
  /** Gilt für jeden Einsatz ohne Häkchen (z. B. Ersthelfer auf der Baustelle). */
  immer: boolean
}

/** Ein Ausweis einer Person (nur, was die Warnung braucht). */
export interface AusweisStand {
  person_id: string
  art: string
  gueltig_bis: string | null
}

/** Eine Lücke: Tätigkeit und wem der Ausweis fehlt (bei «einer» leer: niemand im Team hat ihn). */
export interface AusweisLuecke {
  taetigkeit: string
  wer: 'alle' | 'einer'
  fehlt: string[]
}

/** Regeln aus den Eigenschaften der Auswahlliste lesen (fehlende Angaben: «alle», nicht immer). */
export function taetigkeitPflichten(werte: { schluessel: string; eigenschaften: Record<string, unknown> }[]) {
  return werte.map((w): TaetigkeitPflicht => {
    const e = w.eigenschaften as { ausweise?: string[]; wer?: string; immer?: boolean }
    return {
      schluessel: w.schluessel,
      ausweise: e.ausweise ?? [],
      wer: e.wer === 'einer' ? 'einer' : 'alle',
      immer: e.immer === true,
    }
  })
}

/**
 * Fehlende Pflicht-Ausweise eines Einsatzes (Entscheid 0041): gültig heisst bis zum letzten Einsatztag. Nur eine
 * Warnung wie der Abwesenheits-Konflikt, keine Sperre. Externe Einsätze (Subunternehmer) und leere Teams zählen nicht.
 */
export function ausweisLuecken(
  e: Pick<Einsatz, 'art' | 'bis' | 'personen' | 'taetigkeiten'>,
  pflichten: TaetigkeitPflicht[],
  ausweise: AusweisStand[],
): AusweisLuecke[] {
  if (e.art === 'extern' || e.personen.length === 0) return []
  const hat = (p: string, art: string) =>
    ausweise.some((a) => a.person_id === p && a.art === art && (a.gueltig_bis === null || a.gueltig_bis >= e.bis))
  const hatAlle = (p: string, t: TaetigkeitPflicht) => t.ausweise.every((art) => hat(p, art))
  return pflichten
    .filter((t) => t.ausweise.length > 0 && (t.immer || e.taetigkeiten.includes(t.schluessel)))
    .flatMap((t): AusweisLuecke[] => {
      if (t.wer === 'einer')
        return e.personen.some((p) => hatAlle(p, t)) ? [] : [{ taetigkeit: t.schluessel, wer: 'einer', fehlt: [] }]
      const fehlt = e.personen.filter((p) => !hatAlle(p, t))
      return fehlt.length > 0 ? [{ taetigkeit: t.schluessel, wer: 'alle', fehlt }] : []
    })
}
