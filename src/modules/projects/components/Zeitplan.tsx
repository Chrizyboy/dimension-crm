import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { useDrucken } from '@/hooks/useDrucken'
import { useAbwesenheiten, useEinsaetze, usePersonen, useProjekte, useStandorte } from '../hooks/useProjekte'
import { alsDatum, alsIso, auslastung, montag, plusTage, wochen } from '../lib/zeitplan'
import type { Projekt } from '../types'
import { ZeitplanDruck } from './ZeitplanDruck'
import { ZeitplanRaster, type ZeitplanGruppe } from './ZeitplanRaster'
import { ZeitplanDialog } from './ZeitplanDialog'

const ALLE: Projekt['status'][] = ['auftrag', 'im_bau', 'abgeschlossen']
const BAU = ['ausstehend', 'terminiert', 'ibn', 'fertig'] as const
const WOCHEN = 16

/**
 * Zeitplan (Gantt) wie in V233: je Standort die Baustellen untereinander, Einsätze tagesgenau als Balken
 * (intern, extern, voraussichtlich), darunter die Auslastung je Woche. Klick auf eine Zeile öffnet die
 * Planung. Drucken gibt eine A4-quer-Seite (als PDF speichern im Druckdialog).
 */
export function Zeitplan() {
  const { t } = useTranslation()
  const [start, setStart] = useState(() => alsIso(montag(plusTage(new Date(), -14))))
  const [filter, setFilter] = useState<string[]>([])
  const [offen, setOffen] = useState<Projekt | null>(null)
  const { aktiv: druckt, drucke } = useDrucken()

  const w = useMemo(() => wochen(alsDatum(start), WOCHEN), [start])
  const ende = alsIso(plusTage(alsDatum(start), WOCHEN * 7 - 1))
  const projekte = useProjekte(ALLE)
  const einsaetze = useEinsaetze(start, ende)
  const abwesend = useAbwesenheiten(start, ende)
  const personen = usePersonen()
  const standorte = useStandorte()

  const gruppen = useMemo<ZeitplanGruppe[]>(() => {
    const e = einsaetze.data ?? []
    const mitEinsatz = new Set(e.map((x) => x.projekt_id))
    const zeilen = (projekte.data ?? [])
      .filter((p) => p.status === 'im_bau' || mitEinsatz.has(p.id))
      .filter((p) => filter.length === 0 || filter.includes(p.bau_status ?? 'ausstehend'))
      .map((p) => ({ projekt: p, einsaetze: e.filter((x) => x.projekt_id === p.id) }))
      .sort((a, b) => (a.projekt.baubeginn ?? '9999').localeCompare(b.projekt.baubeginn ?? '9999'))
    return (standorte.data ?? []).map((s) => ({
      standort: s.name,
      zeilen: zeilen.filter((z) => z.projekt.standort_id === s.id),
    }))
  }, [projekte.data, einsaetze.data, standorte.data, filter])

  const last = useMemo(
    () => auslastung(w, einsaetze.data ?? [], abwesend.data ?? []),
    [w, einsaetze.data, abwesend.data],
  )

  const anzahl = (b: string) =>
    (projekte.data ?? []).filter((p) => p.status === 'im_bau' && (p.bau_status ?? 'ausstehend') === b).length
  const schieben = (n: number) => {
    setStart(alsIso(plusTage(alsDatum(start), n * 7)))
  }

  if (projekte.error)
    return <Fehlerzustand details={String(projekte.error)} onNochmal={() => void projekte.refetch()} />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          beschriftung={t('projekte.feld.bauStatus')}
          optionen={BAU.map((b) => ({ wert: b, text: t(`projekte.bauStatus.${b}`), anzahl: anzahl(b) }))}
          gewaehlt={filter}
          onChange={setFilter}
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('projekte.zeitplan.zurueck')}
            onClick={() => {
              schieben(-4)
            }}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setStart(alsIso(montag(plusTage(new Date(), -14))))
            }}
          >
            {t('projekte.zeitplan.heute')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('projekte.zeitplan.vor')}
            onClick={() => {
              schieben(4)
            }}
          >
            <ChevronRight />
          </Button>
          <Button variant="secondary" size="sm" onClick={drucke}>
            <Printer />
            {t('projekte.zeitplan.drucken')}
          </Button>
        </div>
      </div>

      {projekte.isPending || einsaetze.isPending || standorte.isPending ? (
        <Skelett className="h-96" />
      ) : (
        <ZeitplanRaster
          wochen={w}
          gruppen={gruppen}
          auslastung={last}
          personen={personen.data ?? []}
          onZeile={setOffen}
        />
      )}

      <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-primary inline-block h-2.5 w-5 rounded-sm" /> {t('projekte.einsatz.intern')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-accent inline-block h-2.5 w-5 rounded-sm" /> {t('projekte.einsatz.extern')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="border-primary inline-block h-2.5 w-5 rounded-sm border border-dashed" />{' '}
          {t('projekte.einsatz.geplant')}
        </span>
        <span>{t('projekte.zeitplan.hilfe')}</span>
      </p>

      {offen && (
        <ZeitplanDialog
          projekt={offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
      {druckt && <ZeitplanDruck wochen={w} gruppen={gruppen} />}
    </div>
  )
}
