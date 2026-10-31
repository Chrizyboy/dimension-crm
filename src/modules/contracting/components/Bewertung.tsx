import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Angabe } from '@/components/shared/AkteAbschnitt'
import { formatChf } from '@/lib/format'
import { zahl } from '../lib/anzeige'
import type { Grossprojekt, PunkteTeil } from '../types'

/** Der Wert hinter einem Punkte-Baustein in Worten: «1'200 m²», «Gewerbe», «Öl seit 1998», «18 Min.». */
function wert(teil: PunkteTeil, t: TFunction): string {
  switch (teil.was) {
    case 'dach':
      return `${zahl(Number(teil.wert ?? 0))} m²`
    case 'nutzung':
      return t(`grossprojekte.nutzung.${String(teil.wert)}`)
    case 'heizung':
    case 'heizungsersatz':
      return [
        t(`grossprojekte.heizung.${String(teil.wert ?? 'unbekannt')}`),
        teil.jahr ? t('grossprojekte.akte.seit', { jahr: teil.jahr }) : null,
      ]
        .filter(Boolean)
        .join(' ')
    case 'bauherr':
      return t(`grossprojekte.bauherrArt.${String(teil.wert ?? 'unbekannt')}`)
    case 'fahrzeit':
      return t('grossprojekte.fahrzeit', { min: teil.wert })
    case 'wohnungen':
      return String(teil.wert)
  }
}

/**
 * «Warum es passt»: jeder Baustein der Punkte mit Wert und Balken, damit Andy auf einen Blick sieht, was trägt.
 * Bei einem Ausschluss steht der Grund oben.
 */
export function PunkteAufschluesselung({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const max: Record<PunkteTeil['was'], number> = {
    dach: 30,
    nutzung: 20,
    heizung: 20,
    heizungsersatz: 20,
    bauherr: 15,
    fahrzeit: 10,
    wohnungen: 5,
  }
  return (
    <div className="flex flex-col gap-2">
      {g.ausschluss && (
        <p className="bg-warn-soft text-warn rounded px-2 py-1 text-sm">
          {t(`grossprojekte.ausschlussText.${g.ausschluss}`)}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {g.punkte_details.map((teil) => (
          <li key={teil.was} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
            <span className="min-w-0">
              <span className="font-medium">{t(`grossprojekte.teil.${teil.was}`)}</span>
              <span className="text-muted-foreground"> · {wert(teil, t)}</span>
            </span>
            <span className="zahlen text-muted-foreground text-xs">
              {teil.punkte} / {max[teil.was]}
            </span>
            <span className="bg-surface-2 col-span-2 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
              <span
                className="bg-reihe-1 block h-full rounded-full"
                style={{ width: `${Math.min(100, (100 * teil.punkte) / max[teil.was])}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      {g.punkte_details.length < 4 && (
        <p className="text-muted-foreground text-xs">{t('grossprojekte.akte.wenigDaten')}</p>
      )}
    </div>
  )
}

/** Grobe Schätzung PV und Wärme aus Fläche und Annahmen (Einstellungen), mit Hinweis «keine Offerte». */
export function SchaetzungAngaben({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const s = g.schaetzung
  if (!s.kwp && !s.waerme_kw)
    return <p className="text-muted-foreground text-sm">{t('grossprojekte.akte.keineSchaetzung')}</p>
  return (
    <div className="flex flex-col gap-2">
      <dl>
        {s.kwp !== undefined && (
          <>
            <Angabe label={t('grossprojekte.schaetzung.pv')}>
              <span className="zahlen">
                {zahl(s.kwp)} kWp · {zahl(s.ertrag_kwh ?? 0)} kWh/{t('grossprojekte.jahr')}
              </span>
            </Angabe>
            <Angabe label={t('grossprojekte.schaetzung.investition')}>
              <span className="zahlen">{formatChf(s.investition_rappen ?? 0, { mitWaehrung: true })}</span>
            </Angabe>
            {s.preis_rp_kwh !== undefined && (
              <Angabe label={t('grossprojekte.schaetzung.preis')}>
                <span className="zahlen">{t('grossprojekte.schaetzung.rpKwh', { rp: s.preis_rp_kwh.toFixed(1) })}</span>
              </Angabe>
            )}
          </>
        )}
        {s.waerme_kw !== undefined && (
          <>
            <Angabe label={t('grossprojekte.schaetzung.waerme')}>
              <span className="zahlen">{zahl(s.waerme_kw)} kW</span>
            </Angabe>
            <Angabe label={t('grossprojekte.schaetzung.waermeInvestition')}>
              <span className="zahlen">{formatChf(s.waerme_investition_rappen ?? 0, { mitWaehrung: true })}</span>
            </Angabe>
            <Angabe label={t('grossprojekte.schaetzung.rate')}>
              <span className="zahlen">{formatChf(s.waerme_rate_rappen ?? 0, { mitWaehrung: true })}</span>
            </Angabe>
          </>
        )}
      </dl>
      <p className="text-muted-foreground text-xs">{t('grossprojekte.schaetzung.hinweis')}</p>
    </div>
  )
}
