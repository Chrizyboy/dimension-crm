import type { VerbindungsStatus } from '@/services/integrationen'
import type { BetriebStand } from '../types'

/** ok = erledigt, offen = noch zu tun oder freiwillig, fehlt = so kann das Team nicht arbeiten. */
export type PruefStand = 'ok' | 'offen' | 'fehlt'

/** Ein Punkt der Liste «Betrieb»; Text kommt aus i18n betrieb.punkt.<id>.<stand>. */
export interface Pruefpunkt {
  id: string
  stand: PruefStand
  werte: Record<string, string | number>
}

const STUNDE = 3_600_000

/** Liegt der Zeitpunkt höchstens so viele Stunden zurück? */
const frisch = (iso: string | null, stunden: number, jetzt: Date) =>
  Boolean(iso && jetzt.getTime() - Date.parse(iso) <= stunden * STUNDE)

/**
 * Bewertet, was für den Betrieb eingerichtet ist (Reihenfolge wie im Umzug, docs/umzug.md). Rein rechnend, damit
 * die Regeln getestet sind: Ein Zeitplan, der seit 10 Minuten nicht lief, oder eine Sicherung älter als 30 Stunden
 * gilt als Fehler, auch wenn alles eingerichtet scheint.
 */
export function pruefpunkte(e: {
  stand: BetriebStand
  dienste: VerbindungsStatus['eingerichtet'] | null
  microsoftAnmeldung: boolean
  jetzt: Date
}): Pruefpunkt[] {
  const { stand: s, dienste: d, jetzt } = e
  const ja = (b: boolean | undefined): PruefStand => (b ? 'ok' : 'offen')
  const zeitplanEingerichtet = Boolean(d?.zeitplan && s.tresor_url && s.tresor_schluessel)
  return [
    { id: 'datenbank', stand: s.schema ? 'ok' : 'fehlt', werte: { schema: s.schema ?? '' } },
    { id: 'funktionen', stand: d ? 'ok' : 'fehlt', werte: {} },
    {
      id: 'zeitplan',
      stand: !zeitplanEingerichtet ? 'fehlt' : frisch(s.zeitplan_zuletzt, 1 / 6, jetzt) ? 'ok' : 'fehlt',
      werte: { zeit: s.zeitplan_zuletzt ?? '' },
    },
    {
      id: 'sicherung',
      stand: frisch(s.sicherung_zuletzt, 30, jetzt) ? 'ok' : 'fehlt',
      werte: { zeit: s.sicherung_zuletzt ?? '' },
    },
    {
      id: 'daten',
      stand: s.import_zuletzt && s.kontakte > 0 ? 'ok' : 'fehlt',
      werte: { kontakte: s.kontakte, offerten: s.offerten, zeit: s.import_zuletzt ?? '' },
    },
    {
      id: 'personen',
      stand: s.personen_ohne_rolle === 0 ? 'ok' : 'offen',
      werte: { aktiv: s.personen_aktiv, angemeldet: s.personen_angemeldet, ohne: s.personen_ohne_rolle },
    },
    { id: 'anmeldung', stand: ja(e.microsoftAnmeldung), werte: {} },
    {
      id: 'microsoft',
      stand: ja(d?.microsoft && d.app_url),
      werte: { anzahl: s.microsoft_verbunden },
    },
    { id: 'abaninja', stand: ja(d?.abaninja), werte: {} },
    { id: 'sms', stand: ja(d?.sms), werte: {} },
    { id: 'ki', stand: ja(d?.ki), werte: {} },
  ]
}
