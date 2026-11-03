import { CalendarClock, CircleStop, Play, Search, Send, SkipForward } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StoppDialog } from '@/components/shared/automatik/StoppDialog'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDatumZeit } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { useLaufSteuerung } from '@/services/automatik'
import { useUi } from '@/stores/ui'
import { useGeplant } from '../hooks/useAusbau'
import { filterGeplant, GEPLANT_FILTER, type GeplantFilter } from '../lib/geplant'
import type { Geplant as Zeile } from '../types'
import { LaufNachId } from './LaufNachId'

const spalte = spaltenHelfer<Zeile>()

/**
 * Reiter «Geplant»: alles, was die Automationen in nächster Zeit tun, über alle Datensätze. Hier sieht man vor
 * dem Versand, welche Mails morgen in den Ausgangskorb kommen, und kann einzelne Fälle anhalten oder schieben.
 */
export function Geplant() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const abfrage = useGeplant()
  const steuerung = useLaufSteuerung()
  const [filter, setFilter] = useState<GeplantFilter>('alle')
  const [suche, setSuche] = useState('')
  const [offen, setOffen] = useState<string | null>(null)
  const [stopp, setStopp] = useState<Zeile | null>(null)
  const daten = useMemo(() => abfrage.data ?? [], [abfrage.data])
  const gefiltert = useMemo(() => filterGeplant(daten, filter, suche, new Date()), [daten, filter, suche])

  const spalten = spalte.columns([
    spalte.accessor('weiter_am', {
      header: t('automationen.geplant.wann'),
      cell: (c) =>
        c.row.original.stand === 'gestoppt' ? (
          <Badge ton="warnung" punkt>
            {t('automationen.stand.gestoppt')}
          </Badge>
        ) : (
          <span className="zahlen text-xs whitespace-nowrap">{formatDatumZeit(c.getValue())}</span>
        ),
      meta: { breite: 'w-40' },
    }),
    spalte.accessor((g) => g.titel ?? '', {
      id: 'fuer',
      header: t('automationen.geplant.fuer'),
      cell: (c) => {
        const g = c.row.original
        const text = sprache === 'fr' ? g.text_fr : g.text_de
        return (
          <span className="flex min-w-0 flex-col">
            <span className="line-clamp-1 font-medium">{c.getValue() || t('automationen.protokoll.ohneTitel')}</span>
            <span className="text-muted-foreground line-clamp-2 text-xs">
              {g.art ? t(`automationen.aktion.${g.art}`) : ''}
              {text ? ` «${text}»` : ''}
              {g.grund ? ` · ${t('automatik.grundIst', { grund: g.grund })}` : ''}
            </span>
          </span>
        )
      },
    }),
    spalte.accessor((g) => (sprache === 'fr' ? g.name_fr : g.name_de), {
      id: 'automation',
      header: t('automationen.protokoll.automation'),
      cell: (c) => (
        <span className="flex flex-col gap-1 text-xs">
          <span className="line-clamp-2">{c.getValue()}</span>
          {c.row.original.nach_aussen && (
            <Badge ton={c.row.original.modus === 'automatisch' ? 'warnung' : 'info'} className="self-start">
              <Send />
              {t(
                c.row.original.modus === 'automatisch' ? 'automationen.modus.automatisch' : 'automationen.mitFreigabe',
              )}
            </Badge>
          )}
        </span>
      ),
      meta: { breite: 'w-64', nurBreit: true },
    }),
    spalte.display({
      id: 'knoepfe',
      header: () => <span className="sr-only">{t('automationen.geplant.knoepfe')}</span>,
      cell: (c) => {
        const g = c.row.original
        if (!g.darf) return null
        return (
          <span
            className="flex flex-wrap justify-end gap-1"
            onClick={(e) => {
              e.stopPropagation()
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
            }}
          >
            {g.stand === 'gestoppt' ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={steuerung.laeuft}
                onClick={() => void steuerung.fortsetzen(g.lauf_id)}
              >
                <Play />
                {t('automatik.fortsetzen')}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={steuerung.laeuft}
                  onClick={() => void steuerung.verschieben(g.lauf_id, 7)}
                >
                  {t('automatik.plus7')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={steuerung.laeuft}
                  onClick={() => void steuerung.jetzt(g.lauf_id)}
                >
                  <SkipForward />
                  {t('automatik.jetzt')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={steuerung.laeuft}
                  onClick={() => {
                    setStopp(g)
                  }}
                >
                  <CircleStop />
                  {t('automatik.stoppenKurz')}
                </Button>
              </>
            )}
          </span>
        )
      },
      meta: { breite: 'w-72' },
    }),
  ])

  const anzahl = (f: GeplantFilter) => filterGeplant(daten, f, '', new Date()).length
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-2 left-2.5 size-4" aria-hidden="true" />
          <Input
            className="pl-8"
            type="search"
            aria-label={t('automationen.geplant.suche')}
            placeholder={t('automationen.geplant.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        </div>
        <Filterchips
          einzeln
          beschriftung={t('automationen.geplant.filterTitel')}
          gewaehlt={[filter]}
          optionen={GEPLANT_FILTER.map((f) => ({
            wert: f,
            text: t(`automationen.geplant.filter.${f}`),
            anzahl: anzahl(f),
          }))}
          onChange={([f]) => {
            setFilter((f ?? 'alle') as GeplantFilter)
          }}
        />
      </div>
      <Datentabelle
        daten={gefiltert}
        spalten={spalten}
        kennung={(g) => g.lauf_id}
        laedt={abfrage.isLoading}
        fehler={abfrage.error}
        onNochmal={() => void abfrage.refetch()}
        aktiveId={offen}
        onOeffnen={(g) => {
          setOffen(g.lauf_id)
        }}
        beschriftung={t('automationen.ansicht.geplant')}
        leer={
          <Leerzustand
            icon={CalendarClock}
            titel={t('automationen.geplant.leerTitel')}
            text={t('automationen.geplant.leerText')}
          />
        }
      />
      {offen && (
        <LaufNachId
          laufId={offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
      {stopp && (
        <StoppDialog
          name={sprache === 'fr' ? stopp.name_fr : stopp.name_de}
          laeuft={steuerung.laeuft}
          onSchliessen={() => {
            setStopp(null)
          }}
          onStoppen={(grund) => {
            void steuerung.stoppen(stopp.lauf_id, grund).then((ok) => {
              if (ok) setStopp(null)
            })
          }}
        />
      )}
    </div>
  )
}
