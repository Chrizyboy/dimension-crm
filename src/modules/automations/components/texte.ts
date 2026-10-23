import type { TFunction } from 'i18next'
import { formatDatum } from '@/lib/format'
import type { ProtokollEintrag } from '../types'

/** «rolle:verkauf» → «Rolle Verkauf», «zustaendig» → «Zuständige Person». */
export function empfaengerText(t: TFunction, e: string): string {
  const [art, wert] = e.split(':')
  if (art === 'rolle' && wert)
    return t('automationen.empfaenger.rolle', { rolle: t(`automationen.rolle.${wert}`, { defaultValue: wert }) })
  if (art === 'standort' && wert)
    return t('automationen.empfaenger.standort', { rolle: t(`automationen.rolle.${wert}`, { defaultValue: wert }) })
  if (art === 'person') return t('automationen.empfaenger.person')
  return t(`automationen.empfaenger.${e}`, { defaultValue: e })
}

/** Name eines Felds für Bedingungen («lead.kanton» → «Lead: Kanton»). */
export function feldText(t: TFunction, feld: string): string {
  return t(`automationen.feld.${feld.replace('.', '_')}`, { defaultValue: feld })
}

/** Wert aus dem Protokoll als Text (Listen mit Komma, Objekte als JSON). */
function alsText(v: unknown): string {
  if (v === null || v === undefined) return '–'
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

/** Protokollzeile in Worten; unbekannte Meldungen (technische Fehler) bleiben wie sie sind. */
export function meldungText(t: TFunction, e: ProtokollEintrag): string {
  const werte = Object.fromEntries(
    Object.entries(e.werte ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]),
  ) as Record<string, unknown>
  if (e.ergebnis === 'wartet' && typeof werte.bis === 'string') {
    return t('automationen.meldung.wartet', { bis: formatDatum(werte.bis) })
  }
  if (e.ergebnis === 'server') return t('automationen.meldung.server')
  if (!e.meldung) {
    if (e.art === 'bedingungen' || e.art === 'pruefen') return t(`automationen.meldung.${e.art}_ok`)
    return ''
  }
  if (e.meldung === 'bedingung' || e.meldung === 'erledigt_vorher') {
    return t(`automationen.meldung.${e.meldung}`, {
      feld: feldText(t, alsText(werte.feld)),
      ist: alsText(werte.ist),
    })
  }
  return t(`automationen.meldung.${e.meldung}`, { ...werte, defaultValue: e.meldung })
}
