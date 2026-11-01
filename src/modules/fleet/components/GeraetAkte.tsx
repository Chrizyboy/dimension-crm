import { ArrowRightLeft, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useGeraete, useNamen } from '../hooks/useRessourcen'
import type { AkteAktion } from './FahrzeugAkte'
import { FristBadge } from './FristBadge'
import { ZUSTAND_TON } from './geraetSpalten'
import { Verlauf } from './Verlauf'

/**
 * Akte eines Geräts als Seitenpanel: Zustand, nächste Prüfung, wo es ist (Person, Fahrzeug oder Lager),
 * Angaben und Verlauf. Unten «Eintrag erfassen» (Prüfung, Kalibrierung, Schaden) und «Übergeben».
 */
export function GeraetAkte({
  id,
  onAktion,
  onSchliessen,
}: {
  id: string
  onAktion: (a: AkteAktion) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const namen = useNamen()
  const art = useAuswahl('geraeteart')
  const g = useGeraete().data?.find((x) => x.id === id)
  const wo = g?.person_id
    ? namen.person(g.person_id)
    : g?.fahrzeug_id
      ? namen.fahrzeug(g.fahrzeug_id)
      : t('fuhrpark.lager')

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
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onAktion('uebergeben')
                    }}
                  >
                    <ArrowRightLeft />
                    {t('fuhrpark.uebergeben.knopf')}
                  </Button>
                  <Button
                    onClick={() => {
                      onAktion('eintrag')
                    }}
                  >
                    <Plus />
                    {t('fuhrpark.eintrag.knopf')}
                  </Button>
                </>
              ),
            }
          : {})}
      >
        {!g ? (
          <p className="text-muted-foreground py-6 text-sm">{t('fuhrpark.akte.weg')}</p>
        ) : (
          <div className="flex flex-col">
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
                <Angabe label={t('fuhrpark.spalte.wo')}>{wo}</Angabe>
              </dl>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('fuhrpark.akte.angaben')}>
              <dl>
                <Angabe label={t('fuhrpark.feld.hersteller')}>{g.hersteller ?? '–'}</Angabe>
                <Angabe label={t('fuhrpark.feld.serienNr')}>{g.serien_nr ?? '–'}</Angabe>
                <Angabe label={t('fuhrpark.feld.pruefMonate')}>
                  {g.pruef_monate ? t('fuhrpark.monate', { count: g.pruef_monate }) : t('fuhrpark.keinePruefung')}
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
            <AkteAbschnitt titel={t('fuhrpark.akte.verlauf')}>
              <Verlauf bezug={{ geraet: g.id }} />
            </AkteAbschnitt>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
