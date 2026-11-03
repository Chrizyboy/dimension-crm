import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { erledigteSchluessel, fortschritt } from '../lib/schritte'
import type { BaustellenInfo, Rapport, RapportEingabe } from '../types'
import { Balken } from './Balken'

/**
 * Arbeitsschritte der Baustelle (je Projektart aus `einstellungen.baustelle.schritte`): was früher erledigt wurde,
 * steht mit Datum da; was heute erledigt ist, hakt das Team ab. Daraus entsteht der Text des Rapports.
 */
export function SchritteAbschnitt({
  rapport: r,
  info,
  offen,
  onAendern,
}: {
  rapport: Rapport
  info: BaustellenInfo
  offen: boolean
  onAendern: (e: RapportEingabe) => void
}) {
  const { t, i18n } = useTranslation()
  const sprache = i18n.language.startsWith('fr') ? 'fr' : 'de'
  // Früher erledigt = auf der Baustelle erledigt, aber nicht in diesem Rapport.
  const frueher = Object.fromEntries(Object.entries(info.erledigt).filter(([k, d]) => !r.schritte[k] && d < r.datum))
  const alle = erledigteSchluessel(frueher, r.schritte)
  const prozent = fortschritt(info.schritte, alle)
  const heute = Object.values(r.schritte).filter(Boolean).length

  return (
    <AkteAbschnitt titel={t('baustelle.schritte.titel')} zusatz={`${String(prozent)}%`}>
      <Balken wert={prozent} beschriftung={t('baustelle.schritte.titel')} className="mb-3" />
      <ul className="flex flex-col gap-1">
        {info.schritte.map((s) => {
          const datum = frueher[s.schluessel]
          return (
            <li key={s.schluessel}>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <Checkbox
                  checked={Boolean(datum) || Boolean(r.schritte[s.schluessel])}
                  disabled={!offen || Boolean(datum)}
                  onCheckedChange={(v) => {
                    onAendern({ schritte: { [s.schluessel]: v === true } })
                  }}
                />
                <span className={datum ? 'text-muted-foreground' : ''}>{s[sprache]}</span>
                {datum && <span className="text-muted-foreground ml-auto text-xs">{formatDatum(datum)}</span>}
              </label>
            </li>
          )
        })}
      </ul>
      {offen && heute === 0 && <p className="text-muted-foreground mt-2 text-xs">{t('baustelle.schritte.hinweis')}</p>}
    </AkteAbschnitt>
  )
}
