import { Boxes } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { spaltenHelfer } from '@/lib/tabelle'
import { formatDatum } from '@/lib/format'
import { useMaterialplan } from '../hooks/useEinkauf'
import type { PlanZeile } from '../types'
import { MaterialAkte } from './MaterialAkte'
import { DatumZelle, NummerZelle } from '@/components/shared/Zellen'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'

type Zeile = PlanZeile
const FILTER = ['gefaehrdet', 'fehlt', 'mitListe', 'alle'] as const
type Filter = (typeof FILTER)[number]
const spalte = spaltenHelfer<Zeile>()

/**
 * Materialplan: offene Aufträge und Baustellen, nächster Baubeginn zuerst. Je Projekt die Deckung, bis wann
 * bestellt werden muss (Montage − Lieferzeit − Puffer), wann die letzte Lieferung kommt und ob die Montage
 * gefährdet ist. Ein Klick öffnet die Materialliste mit Vorschlag und Bestellvorschlag.
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
  const liste = useMaterialplan()
  const [filter, setFilter] = useState<Filter>('alle')
  const [suche, setSuche] = useState('')
  const spalten = useMemo(
    () =>
      spalte.columns([
        spalte.accessor('nummer', {
          header: t('einkauf.spalte.projekt'),
          cell: (c) => <NummerZelle>{c.getValue()}</NummerZelle>,
          meta: { breite: 'w-24' },
        }),
        spalte.accessor('kunde', {
          header: t('einkauf.spalte.kunde'),
          cell: (c) => (
            <span className="flex max-w-[22rem] min-w-0 flex-col">
              <span className="line-clamp-2 font-medium">{c.getValue()}</span>
              <span className="text-muted-foreground truncate text-xs">
                {[c.row.original.ort, c.row.original.titel].filter(Boolean).join(' · ')}
              </span>
            </span>
          ),
        }),
        spalte.accessor((p) => p.baubeginn ?? '9999', {
          id: 'baubeginn',
          header: t('einkauf.spalte.baubeginn'),
          cell: (c) => <DatumZelle wert={c.row.original.baubeginn} />,
        }),
        spalte.accessor('deckung_prozent', {
          header: t('einkauf.plan.deckung'),
          cell: (c) => {
            const p = c.row.original
            if (p.zeilen === 0) return <span className="text-muted-foreground text-xs">{t('einkauf.keineListe')}</span>
            const ton = p.gefaehrdet ? 'bg-bad' : p.zeilen_fehlt > 0 ? 'bg-warn' : 'bg-ok'
            return (
              <span className="flex min-w-24 items-center gap-2">
                <span className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                  <span className={`block h-full ${ton}`} style={{ width: `${String(p.deckung_prozent)}%` }} />
                </span>
                <span className="zahlen text-xs">{p.deckung_prozent} %</span>
              </span>
            )
          },
        }),
        spalte.accessor((p) => p.bestellen_bis ?? '9999', {
          id: 'bestellen_bis',
          header: t('einkauf.plan.bestellenBis'),
          cell: (c) => {
            const p = c.row.original
            if (!p.bestellen_bis) return <span className="text-muted-foreground">–</span>
            return <DatumZelle wert={p.bestellen_bis} />
          },
          meta: { nurBreit: true },
        }),
        spalte.accessor((p) => (p.gefaehrdet ? 0 : p.zeilen === 0 ? 3 : p.zeilen_fehlt > 0 ? 1 : 2), {
          id: 'material',
          header: t('einkauf.spalte.material'),
          cell: (c) => {
            const p = c.row.original
            if (p.gefaehrdet) return <Badge ton="kritisch">{t('einkauf.plan.gefaehrdet')}</Badge>
            if (p.zeilen === 0) return null
            if (p.zeilen_fehlt > 0) return <Badge ton="warnung">{t('einkauf.fehlen', { count: p.zeilen_fehlt })}</Badge>
            if (p.zeilen_unterwegs > 0 && p.erwartet_spaetestens)
              return <Badge ton="info">{t('einkauf.plan.kommt', { datum: formatDatum(p.erwartet_spaetestens) })}</Badge>
            return <Badge ton="ok">{t('einkauf.gedeckt')}</Badge>
          },
        }),
      ]),
    [t],
  )
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? []).filter(
      (p) =>
        (filter === 'alle' ||
          (filter === 'gefaehrdet' ? p.gefaehrdet : filter === 'mitListe' ? p.zeilen > 0 : p.zeilen_fehlt > 0)) &&
        (!s || `${p.nummer} ${p.kunde} ${p.ort ?? ''} ${p.titel ?? ''}`.toLowerCase().includes(s)),
    )
  }, [liste.data, filter, suche])
  const offen = liste.data?.find((p) => p.id === projektId)

  return (
    <div className="flex flex-col gap-3">
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('einkauf.projektSuche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
      >
        <Filterchips
          einzeln
          beschriftung={t('einkauf.filter')}
          optionen={FILTER.map((f) => ({ wert: f, text: t(`einkauf.materialFilter.${f}`) }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as Filter)
          }}
        />
      </Werkzeugleiste>
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
