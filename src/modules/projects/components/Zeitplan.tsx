import { ChevronLeft, ChevronRight, Printer, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { useDrucken } from '@/hooks/useDrucken'
import { useSchmal } from '@/hooks/useSchmal'
import { useTaste } from '@/hooks/useTaste'
import { useZeitplan, type ZeitplanFilter } from '../hooks/useZeitplan'
import { alsDatum, alsIso, arbeitsMontag, plusTage } from '../lib/zeitplan'
import type { Projekt } from '../types'
import { ZeitplanDialog } from './ZeitplanDialog'
import { ZeitplanDruck } from './ZeitplanDruck'
import { ZeitplanHandy } from './ZeitplanHandy'
import { ZeitplanRaster } from './ZeitplanRaster'
import { ZeitplanZuPlanen } from './ZeitplanZuPlanen'

const BAU = ['ausstehend', 'terminiert', 'ibn', 'fertig'] as const
/** Zeitraum am PC: zwei Wochen tagesgenau, sechs Wochen (Standard) oder ein Quartal. */
const ZOOM = { 2: 0, 6: -1, 13: -2 } as const
type Zoom = keyof typeof ZOOM

const ersterMontag = (z: Zoom) => alsIso(plusTage(arbeitsMontag(new Date()), ZOOM[z] * 7))

/**
 * Zeitplan der Baustellen (V233 «Bauplanung: Zeitplan»), neu gedacht: am PC ein Raster mit Sicht «Baustellen»
 * oder «Team», Zeitraum 2/6/13 Wochen, Einsätze zum Ziehen, Konflikte rot und rechts «Zu planen». Am Handy eine
 * Woche als Liste nach Tagen. Drucken gibt A4 quer.
 */
export function Zeitplan() {
  const { t } = useTranslation()
  const schmal = useSchmal()
  const [zoom, setZoom] = useState<Zoom>(6)
  const [start, setStart] = useState(() => ersterMontag(6))
  const [handyMontag, setHandyMontag] = useState(() => alsIso(arbeitsMontag(new Date())))
  const [f, setF] = useState<ZeitplanFilter>({ sicht: 'baustellen', suche: '', standorte: [], bau: [] })
  const [offen, setOffen] = useState<{ projekt: Projekt; neuAb?: string } | null>(null)
  const { aktiv: druckt, drucke } = useDrucken()
  const z = useZeitplan(schmal ? handyMontag : start, schmal ? 1 : zoom, f)

  const schieben = (n: number) => {
    setStart(alsIso(plusTage(alsDatum(start), n * 7)))
  }
  const schritt = zoom === 2 ? 1 : zoom === 6 ? 2 : 4
  const heute = () => {
    setStart(ersterMontag(zoom))
  }
  useTaste(
    'arrowleft',
    () => {
      schieben(-schritt)
    },
    !schmal && !offen,
    t('projekte.zeitplan.zurueck'),
  )
  useTaste(
    'arrowright',
    () => {
      schieben(schritt)
    },
    !schmal && !offen,
    t('projekte.zeitplan.vor'),
  )
  useTaste('t', heute, !schmal && !offen, t('projekte.zeitplan.heute'))

  if (z.fehler) return <Fehlerzustand details={String(z.fehler)} onNochmal={z.nochmal} />

  const standortChips = (
    <Filterchips
      beschriftung={t('projekte.zeitplan.standort')}
      optionen={z.standorte.map((s) => ({ wert: s.id, text: s.name }))}
      gewaehlt={f.standorte}
      onChange={(standorte) => {
        setF({ ...f, standorte })
      }}
    />
  )
  const planen = (p: Projekt) => {
    setOffen({ projekt: p, neuAb: alsIso(new Date()) })
  }

  return (
    <div className="flex flex-col gap-3">
      {schmal ? (
        <ZeitplanHandy
          montag={handyMontag}
          onMontag={setHandyMontag}
          z={z}
          filter={standortChips}
          onOeffnen={(p) => {
            setOffen({ projekt: p })
          }}
          onPlanen={planen}
        />
      ) : (
        <>
          <Werkzeugleiste
            suche={
              <Suchfeld
                beschriftung={t('projekte.zeitplan.suchen')}
                value={f.suche}
                onChange={(e) => {
                  setF({ ...f, suche: e.target.value })
                }}
              />
            }
            rechts={
              <>
                <Filterchips
                  einzeln
                  beschriftung={t('projekte.zeitplan.sicht')}
                  optionen={(['baustellen', 'team'] as const).map((s) => ({
                    wert: s,
                    text: t(`projekte.zeitplan.sicht_${s}`),
                  }))}
                  gewaehlt={[f.sicht]}
                  onChange={([s]) => {
                    setF({ ...f, sicht: s === 'team' ? 'team' : 'baustellen' })
                  }}
                />
                <Filterchips
                  einzeln
                  beschriftung={t('projekte.zeitplan.zeitraum')}
                  optionen={([2, 6, 13] as const).map((w) => ({
                    wert: String(w),
                    text: t(`projekte.zeitplan.zoom_${String(w)}`),
                  }))}
                  gewaehlt={[String(zoom)]}
                  onChange={([w]) => {
                    const neu = Number(w) as Zoom
                    setZoom(neu)
                    setStart(ersterMontag(neu))
                  }}
                />
                <span className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('projekte.zeitplan.zurueck')}
                    onClick={() => {
                      schieben(-schritt)
                    }}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={heute}>
                    {t('projekte.zeitplan.heute')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('projekte.zeitplan.vor')}
                    onClick={() => {
                      schieben(schritt)
                    }}
                  >
                    <ChevronRight />
                  </Button>
                </span>
                <Button variant="secondary" size="sm" onClick={drucke}>
                  <Printer />
                  {t('projekte.zeitplan.drucken')}
                </Button>
              </>
            }
          >
            {standortChips}
            <Filterchips
              beschriftung={t('projekte.feld.bauStatus')}
              optionen={BAU.map((b) => ({ wert: b, text: t(`projekte.bauStatus.${b}`) }))}
              gewaehlt={f.bau}
              onChange={(bau) => {
                setF({ ...f, bau })
              }}
            />
            {z.konflikte > 0 && (
              <Badge ton="kritisch" className="ml-auto">
                <TriangleAlert aria-hidden />
                {t('projekte.zeitplan.konflikte', { count: z.konflikte })}
              </Badge>
            )}
          </Werkzeugleiste>

          <div className="grid gap-4 xl:grid-cols-[1fr_16rem]">
            {z.laedt ? (
              <Skelett className="h-96" />
            ) : z.gruppen.length === 0 ? (
              <p className="text-muted-foreground bg-surface rounded-xl border px-4 py-10 text-center text-sm">
                {t('projekte.zeitplan.leer')}
              </p>
            ) : (
              <ZeitplanRaster
                wochen={z.wochen}
                gruppen={z.gruppen}
                auslastung={z.last}
                team={f.sicht === 'team'}
                onOeffnen={(p) => {
                  setOffen({ projekt: p })
                }}
                onLeer={(p, tag) => {
                  setOffen({ projekt: p, neuAb: tag })
                }}
                onZiehen={z.ziehen}
              />
            )}
            <ZeitplanZuPlanen projekte={z.offen} onPlanen={planen} className="xl:max-h-[calc(100dvh-16rem)]" />
          </div>
          <Legende />
        </>
      )}

      {offen && (
        <ZeitplanDialog
          projekt={offen.projekt}
          {...(offen.neuAb ? { neuAb: offen.neuAb } : {})}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
      {druckt && (
        <ZeitplanDruck
          wochen={z.wochen}
          gruppen={z.gruppen}
          spalte={t(f.sicht === 'team' ? 'projekte.zeitplan.person' : 'projekte.zeitplan.baustelle')}
        />
      )}
    </div>
  )
}

/** Legende unter dem Raster: Farben und was man mit der Maus tun kann. */
function Legende() {
  const { t } = useTranslation()
  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="bg-primary inline-block h-3 w-5 rounded-sm" /> {t('projekte.einsatz.intern')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-accent inline-block h-3 w-5 rounded-sm" /> {t('projekte.einsatz.extern')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="border-primary inline-block h-3 w-5 rounded-sm border border-dashed" />
        {t('projekte.einsatz.geplant')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-info-soft border-info inline-block h-3 w-5 rounded-sm border" />
        {t('projekte.einsatz.service')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-muted schraffur inline-block h-3 w-5 rounded-sm" /> {t('projekte.zeitplan.abwesendLabel')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="ring-bad inline-block h-3 w-5 rounded-sm ring-2" /> {t('projekte.zeitplan.konflikt')}
      </span>
      <span>{t('projekte.zeitplan.hilfe')}</span>
    </p>
  )
}
