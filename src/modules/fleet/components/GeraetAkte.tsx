import { ArrowRightLeft, CalendarPlus, CircleAlert, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { useGeraete, useNamen } from '../hooks/useRessourcen'
import { fristStand, heuteZuerich, tageBis } from '../lib/fristen'
import type { Schaden } from '../types'
import { BelegungBox, SchaedenBox } from './AkteListen'
import { DateienBox } from './DateienBox'
import type { AkteAktion } from './FahrzeugSeite'
import { FristBadge } from './FristBadge'
import { ZUSTAND_TON } from './geraetSpalten'
import { Verlauf } from './Verlauf'

/**
 * Akte eines Geräts als Seitenpanel: Zustand und Prüfung (Messgerät mit abgelaufener Kalibrierung deutlich
 * markiert), wo es ist und seit wann, Kauf und Garantie, Schäden, Reservierungen, Dokumente und Verlauf.
 */
export function GeraetAkte({
  id,
  onAktion,
  onSchaden,
  onSchliessen,
}: {
  id: string
  onAktion: (a: AkteAktion) => void
  onSchaden: (s: Schaden) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const namen = useNamen()
  const art = useAuswahl('geraeteart')
  const g = useGeraete().data?.find((x) => x.id === id)
  const heute = heuteZuerich()
  const wo = g?.person_id
    ? namen.person(g.person_id)
    : g?.fahrzeug_id
      ? namen.fahrzeug(g.fahrzeug_id)
      : t('fuhrpark.lager')
  const messgeraetAbgelaufen = g?.art === 'messgeraet' && fristStand(g.naechste_pruefung, heute) === 'ueberfaellig'
  const knopf = (a: AkteAktion, Icon: typeof Plus, haupt = false) => (
    <Button
      variant={haupt ? 'primary' : 'secondary'}
      onClick={() => {
        onAktion(a)
      }}
    >
      <Icon />
      {t(`fuhrpark.aktion.${a}`)}
    </Button>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={g ? g.bezeichnung : t('fuhrpark.akte.geraet')}
        {...(g
          ? {
              beschreibung: [art.text(g.art), g.inventar_nr, namen.standort(g.standort_id)]
                .filter((x) => x && x !== '–')
                .join(' · '),
              fuss: (
                <div className="flex flex-wrap justify-end gap-2">
                  {knopf('uebergeben', ArrowRightLeft)}
                  {knopf('reservieren', CalendarPlus)}
                  {knopf('schaden', CircleAlert)}
                  {knopf('eintrag', Plus, true)}
                </div>
              ),
            }
          : {})}
      >
        {!g ? (
          <p className="text-muted-foreground py-6 text-sm">{t('fuhrpark.akte.weg')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messgeraetAbgelaufen && (
              <p className="bg-bad-soft text-bad rounded-md px-3 py-2 text-sm font-medium">
                {t('fuhrpark.akte.kalibrierungAbgelaufen')}
              </p>
            )}
            {g.ausgemustert_am && (
              <p className="bg-muted rounded-md px-3 py-2 text-sm">
                {t('fuhrpark.akte.ausgemustert', {
                  datum: formatDatum(g.ausgemustert_am),
                  grund: g.ausgemustert_grund ? t(`fuhrpark.ausmustern.grund.${g.ausgemustert_grund}`) : '',
                })}
              </p>
            )}
            <AkteAbschnitt titel={t('fuhrpark.akte.stand')}>
              <dl>
                <Angabe label={t('fuhrpark.spalte.zustand')}>
                  <Badge ton={ZUSTAND_TON[g.zustand]} punkt>
                    {t(`fuhrpark.zustand.${g.zustand}`)}
                  </Badge>
                </Angabe>
                <Angabe label={t('fuhrpark.spalte.pruefung')}>
                  <FristBadge datum={g.naechste_pruefung} />
                </Angabe>
                <Angabe label={t('fuhrpark.spalte.wo')}>
                  {wo}
                  {g.person_id && g.uebernommen_am && (
                    <span className="text-muted-foreground">
                      {' '}
                      · {t('fuhrpark.akte.seitTagen', { count: tageBis(heute, g.uebernommen_am.slice(0, 10)) })}
                    </span>
                  )}
                </Angabe>
                {g.zurueck_bis && (
                  <Angabe label={t('fuhrpark.feld.zurueck_bis')}>
                    <FristBadge datum={g.zurueck_bis} vorlauf={0} />
                  </Angabe>
                )}
              </dl>
            </AkteAbschnitt>
            <SchaedenBox bezug={{ geraet: g.id }} onWaehlen={onSchaden} />
            <BelegungBox
              bezug={{ geraet: g.id }}
              onReservieren={() => {
                onAktion('reservieren')
              }}
            />
            <AkteAbschnitt titel={t('fuhrpark.akte.angaben')}>
              <dl>
                <Angabe label={t('fuhrpark.feld.hersteller')}>{g.hersteller ?? '–'}</Angabe>
                <Angabe label={t('fuhrpark.feld.serienNr')}>{g.serien_nr ?? '–'}</Angabe>
                <Angabe label={t('fuhrpark.feld.pruefMonate')}>
                  {g.pruef_monate ? t('fuhrpark.monate', { count: g.pruef_monate }) : t('fuhrpark.keinePruefung')}
                </Angabe>
                <Angabe label={t('fuhrpark.feld.pruefstelle')}>{g.pruefstelle ?? '–'}</Angabe>
                <Angabe label={t('fuhrpark.feld.kaufdatum')}>{g.kaufdatum ? formatDatum(g.kaufdatum) : '–'}</Angabe>
                <Angabe label={t('fuhrpark.feld.kaufpreis')}>
                  {g.kaufpreis_rappen !== null ? formatChf(g.kaufpreis_rappen, { mitWaehrung: true }) : '–'}
                </Angabe>
                <Angabe label={t('fuhrpark.feld.lieferant')}>{g.lieferant ?? '–'}</Angabe>
                <Angabe label={t('fuhrpark.feld.garantie_bis')}>
                  {g.garantie_bis ? formatDatum(g.garantie_bis) : '–'}
                </Angabe>
                <Angabe label={t('fuhrpark.feld.notiz')}>{g.notiz ?? '–'}</Angabe>
              </dl>
              <Button
                variant="ghost"
                size="sm"
                className="mt-1"
                onClick={() => {
                  onAktion('bearbeiten')
                }}
              >
                <Pencil />
                {t('fuhrpark.akte.bearbeiten')}
              </Button>
            </AkteAbschnitt>
            <DateienBox ordner="geraet" id={g.id} />
            <AkteAbschnitt titel={t('fuhrpark.akte.verlauf')}>
              <Verlauf bezug={{ geraet: g.id }} />
            </AkteAbschnitt>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
