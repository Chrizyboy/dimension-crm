import { Boxes } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { useMaterialProjekte } from '../hooks/useEinkauf'
import type { MaterialProjekt } from '../types'
import { MaterialAkte } from './MaterialAkte'

type Zeile = MaterialProjekt & { zeilen: number; fehlt: number }
const FILTER = ['fehlt', 'mitListe', 'alle'] as const
type Filter = (typeof FILTER)[number]
const spalte = spaltenHelfer<Zeile>()

/**
 * Material je Projekt: offene Aufträge und Baustellen, nächster Baubeginn zuerst, mit dem Stand der
 * Materialliste. Ein Klick öffnet die Liste mit Vorschlag und Bestellvorschlag.
 */
export function MaterialProjekte({
  projektId,
  onProjekt,
  onBestellung,
}: {
  projektId: string | null
  onProjekt: (id: string | null) => void
  onBestellung: (id: string) => void
}) {
  const { t } = useTranslation()
  const liste = useMaterialProjekte()
  const [filter, setFilter] = useState<Filter>('alle')
  const [suche, setSuche] = useState('')
  const spalten = useMemo(
    () =>
      spalte.columns([
        spalte.accessor('nummer', {
          header: t('einkauf.spalte.projekt'),
          cell: (c) => <span className="zahlen font-mono text-xs whitespace-nowrap">{c.getValue()}</span>,
          meta: { breite: 'w-24' },
        }),
        spalte.accessor('kunde', {
          header: t('einkauf.spalte.kunde'),
          cell: (c) => (
            <span className="flex max-w-[22rem] min-w-0 flex-col">
              <span className="line-clamp-2 font-medium">{c.getValue()}</span>
              <span className="text-muted-foreground line-clamp-2 text-xs">
                {[c.row.original.ort, c.row.original.titel].filter(Boolean).join(' · ')}
              </span>
            </span>
          ),
        }),
        spalte.accessor((p) => p.baubeginn ?? '9999', {
          id: 'baubeginn',
          header: t('einkauf.spalte.baubeginn'),
          cell: (c) => (c.row.original.baubeginn ? formatDatum(c.row.original.baubeginn) : '–'),
        }),
        spalte.accessor((p) => (p.zeilen === 0 ? -1 : p.fehlt), {
          id: 'material',
          header: t('einkauf.spalte.material'),
          cell: (c) => {
            const p = c.row.original
            if (p.zeilen === 0) return <span className="text-muted-foreground text-xs">{t('einkauf.keineListe')}</span>
            if (p.fehlt === 0) return <Badge ton="ok">{t('einkauf.gedeckt')}</Badge>
            return <Badge ton="warnung">{t('einkauf.fehlen', { count: p.fehlt })}</Badge>
          },
        }),
      ]),
    [t],
  )
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? []).filter(
      (p) =>
        (filter === 'alle' || (filter === 'mitListe' ? p.zeilen > 0 : p.fehlt > 0)) &&
        (!s || `${p.nummer} ${p.kunde} ${p.ort ?? ''} ${p.titel ?? ''}`.toLowerCase().includes(s)),
    )
  }, [liste.data, filter, suche])
  const offen = liste.data?.find((p) => p.id === projektId)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('einkauf.filter')}
          optionen={FILTER.map((f) => ({ wert: f, text: t(`einkauf.materialFilter.${f}`) }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as Filter)
          }}
        />
        <Input
          type="search"
          className="w-full sm:w-64"
          aria-label={t('einkauf.projektSuche')}
          placeholder={t('einkauf.projektSuche')}
          value={suche}
          onChange={(e) => {
            setSuche(e.target.value)
          }}
        />
      </div>
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(p) => p.id}
          aktiveId={projektId}
          onOeffnen={(p) => {
            onProjekt(p.id)
          }}
          beschriftung={t('einkauf.reiter.material')}
          leer={<Leerzustand icon={Boxes} titel={t('einkauf.keineProjekte')} text={t('einkauf.keineProjekteText')} />}
        />
      )}
      {projektId && (
        <MaterialAkte
          key={projektId}
          projektId={projektId}
          projekt={offen ?? null}
          onBestellung={onBestellung}
          onSchliessen={() => {
            onProjekt(null)
          }}
        />
      )}
    </div>
  )
}
