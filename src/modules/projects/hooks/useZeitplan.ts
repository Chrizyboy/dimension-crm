import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { alsDatum, alsIso, auslastung, plusTage, wochen as wochenAb } from '../lib/zeitplan'
import { baustellenSicht, teamSicht, verschoben, zuPlanen, type PlanBalken } from '../lib/zeitplanAnsicht'
import { einsatzAendern } from '../services/planung'
import type { Projekt } from '../types'
import { useAktion } from './useAktion'
import {
  useAbwesenheiten,
  useEinsaetze,
  usePersonen,
  useProjekte,
  useStandorte,
  useSubunternehmer,
} from './useProjekte'

const ALLE: Projekt['status'][] = ['auftrag', 'im_bau', 'abgeschlossen']

/** Filter des Zeitplans. */
export interface ZeitplanFilter {
  sicht: 'baustellen' | 'team'
  suche: string
  standorte: string[]
  bau: string[]
}

/**
 * Daten des Zeitplans für einen Zeitraum: Zeilen der gewählten Sicht, Auslastung, «Zu planen», Konflikte und
 * Ziehen mit sofortiger Anzeige (der Balken bleibt am neuen Ort, bis die Datenbank bestätigt) und «Rückgängig».
 */
export function useZeitplan(start: string, anzahlWochen: number, f: ZeitplanFilter) {
  const { t } = useTranslation()
  const { aus } = useAktion()
  const arten = useAuswahl('abwesenheit')
  const [vorschau, setVorschau] = useState<Record<string, { von: string; bis: string }>>({})
  const w = useMemo(() => wochenAb(alsDatum(start), anzahlWochen), [start, anzahlWochen])
  const ende = alsIso(plusTage(alsDatum(w[0]?.montag ?? start), anzahlWochen * 7 - 1))
  const von = w[0]?.montag ?? start
  const projekte = useProjekte(ALLE)
  const einsaetze = useEinsaetze(von, ende)
  const abwesend = useAbwesenheiten(von, ende)
  const personen = usePersonen()
  const standorte = useStandorte()
  const subs = useSubunternehmer()

  const daten = useMemo(() => {
    const e = (einsaetze.data ?? []).map((x) => ({ ...x, ...vorschau[x.id] }))
    const p = projekte.data ?? []
    const wort = f.suche.trim().toLowerCase()
    const passt = (x: Projekt) =>
      (f.standorte.length === 0 || f.standorte.includes(x.standort_id ?? '')) &&
      (f.bau.length === 0 || f.bau.includes(x.bau_status ?? 'ausstehend')) &&
      (!wort || `${x.kunde} ${x.ort ?? ''} ${x.nummer}`.toLowerCase().includes(wort))
    const eingabe = {
      projekte: p,
      einsaetze: e,
      abwesend: abwesend.data ?? [],
      personen: personen.data ?? [],
      subunternehmer: subs.data ?? [],
      passt,
    }
    const baustellen = baustellenSicht({ ...eingabe, standorte: standorte.data ?? [] })
    const gruppen =
      f.sicht === 'team'
        ? teamSicht({
            ...eingabe,
            abwesendText: (a) => (a === 'outlook' ? t('projekte.abwesenheit.outlook') : arten.text(a)),
          }).map((g) => ({
            ...g,
            titel: t(g.id === 'team' ? 'projekte.zeitplan.team' : 'projekte.zeitplan.subunternehmer'),
          }))
        : baustellen
    const team = teamSicht({ ...eingabe, passt: () => true, abwesendText: () => '' }).find((g) => g.id === 'team')
    const teamIds = (team?.zeilen ?? []).map((z) => z.id)
    const last = auslastung(w, e, abwesend.data ?? []).map((a) => ({
      ...a,
      verfuegbar: teamIds.filter((id) => !a.abwesend.includes(id)).length,
    }))
    const konflikte = new Set(
      baustellen.flatMap((g) =>
        g.zeilen.flatMap((z) => z.balken.filter((b) => b.konflikt.length > 0).map((b) => b.id)),
      ),
    ).size
    return { gruppen, baustellen, last, konflikte, offen: zuPlanen(p).filter(passt) }
  }, [einsaetze.data, projekte.data, abwesend.data, personen.data, subs.data, standorte.data, vorschau, f, w, t, arten])

  /** Einsatz verschieben oder verlängern, mit «Rückgängig» in der Meldung. */
  function ziehen(b: PlanBalken, tage: number, nurEnde: boolean) {
    const p = b.projekt
    const e = b.einsatz
    if (!p?.bau_status || !e) return
    const neu = verschoben(e, tage, nurEnde)
    setVorschau((v) => ({ ...v, [e.id]: { von: neu.von, bis: neu.bis } }))
    const bau = p.bau_status
    void aus(() => einsatzAendern(p.id, bau, e.id, (x) => ({ ...x, von: neu.von, bis: neu.bis }))).then((ok) => {
      setVorschau((v) => {
        const rest = { ...v }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Vorschau eines Einsatzes zurücknehmen
        delete rest[e.id]
        return rest
      })
      if (!ok) return
      melde(
        'ok',
        nurEnde
          ? { de: `Einsatz bis ${formatDatum(neu.bis)}`, fr: `Intervention jusqu’au ${formatDatum(neu.bis)}` }
          : { de: 'Einsatz verschoben', fr: 'Intervention déplacée' },
        {
          text: { de: p.kunde, fr: p.kunde },
          aktion: {
            text: { de: 'Rückgängig', fr: 'Annuler' },
            ausfuehren: () => {
              void aus(() => einsatzAendern(p.id, bau, e.id, (x) => ({ ...x, von: e.von, bis: e.bis })))
            },
          },
        },
      )
    })
  }

  return {
    wochen: w,
    ...daten,
    personen: personen.data ?? [],
    standorte: standorte.data ?? [],
    abwesend: abwesend.data ?? [],
    projekte: projekte.data ?? [],
    laedt: projekte.isPending || einsaetze.isPending || standorte.isPending,
    fehler: projekte.error ?? einsaetze.error,
    nochmal: () => void Promise.all([projekte.refetch(), einsaetze.refetch()]),
    ziehen,
  }
}
