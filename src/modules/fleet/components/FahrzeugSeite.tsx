import { ArrowLeft, ArrowRightLeft, CalendarPlus, CircleAlert, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { useFahrzeuge, useNamen } from '../hooks/useRessourcen'
import type { Schaden } from '../types'
import { AnBordBox, BelegungBox, SchaedenBox } from './AkteListen'
import { Box } from './Box'
import { DateienBox } from './DateienBox'
import { AngabenBox, FristenBox, VersicherungBox } from './FahrzeugBoxen'
import { Kennzeichen } from './Kennzeichen'
import { KostenBox, LeasingBox } from './LeasingKostenBox'
import { Verlauf } from './Verlauf'

export type AkteAktion = 'bearbeiten' | 'eintrag' | 'uebergeben' | 'reservieren' | 'schaden'

/**
 * Akte eines Fahrzeugs als ganze Seite: links Fristen, Leasing und Kosten, in der Mitte Schäden, Belegung und
 * Verlauf, rechts Angaben, Versicherung, Ausrüstung an Bord und Dokumente. Oben die häufigen Handgriffe.
 */
export function FahrzeugSeite({
  id,
  onAktion,
  onSchaden,
  onZurueck,
}: {
  id: string
  onAktion: (a: AkteAktion) => void
  onSchaden: (s: Schaden) => void
  onZurueck: () => void
}) {
  const { t } = useTranslation()
  const namen = useNamen()
  const daten = useFahrzeuge()
  const f = daten.data?.find((x) => x.id === id)
  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  if (!daten.data) return <Skelett className="h-[32rem]" />
  if (!f)
    return (
      <div className="flex flex-col gap-3">
        <Button variant="link" className="self-start" onClick={onZurueck}>
          <ArrowLeft />
          {t('fuhrpark.akte.alleFahrzeuge')}
        </Button>
        <p className="text-muted-foreground">{t('fuhrpark.akte.weg')}</p>
      </div>
    )
  const knopf = (a: AkteAktion, icon: typeof Plus, haupt = false) => {
    const Icon = icon
    return (
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
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button variant="link" className="self-start" onClick={onZurueck}>
          <ArrowLeft />
          {t('fuhrpark.akte.alleFahrzeuge')}
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">{f.bezeichnung}</h1>
              <Kennzeichen nummer={f.kennzeichen} gross />
              {f.ausser_betrieb && <Badge>{t('fuhrpark.ausserBetrieb')}</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">
              {[f.marke_modell, f.jahrgang, namen.standort(f.standort_id), namen.person(f.person_id)]
                .filter((x) => x && x !== '–')
                .join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {knopf('uebergeben', ArrowRightLeft)}
            {knopf('reservieren', CalendarPlus)}
            {knopf('schaden', CircleAlert)}
            {knopf('eintrag', Plus, true)}
          </div>
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-[22rem_minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <FristenBox f={f} />
          <LeasingBox f={f} />
          <KostenBox f={f} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:order-last lg:col-span-2 2xl:order-none 2xl:col-span-1">
          <SchaedenBox bezug={{ fahrzeug: f.id }} onWaehlen={onSchaden} />
          <BelegungBox
            bezug={{ fahrzeug: f.id }}
            onReservieren={() => {
              onAktion('reservieren')
            }}
          />
          <Box titel={t('fuhrpark.akte.verlauf')}>
            <Verlauf bezug={{ fahrzeug: f.id }} />
          </Box>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <AngabenBox
            f={f}
            onBearbeiten={() => {
              onAktion('bearbeiten')
            }}
          />
          <VersicherungBox f={f} />
          <AnBordBox fahrzeugId={f.id} />
          <DateienBox ordner="fahrzeug" id={f.id} />
        </div>
      </div>
    </div>
  )
}
