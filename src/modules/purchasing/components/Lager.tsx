import { ListPlus, Plus, Warehouse } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { spaltenHelfer } from '@/lib/tabelle'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useLager, useLagerorte } from '../hooks/useEinkauf'
import { formatMenge } from '../lib/anzeige'
import { nachbestellen } from '../services/lager'
import type { LagerZeile } from '../types'
import { LagerBuchenDialog } from './LagerBuchenDialog'

const FILTER = ['alle', 'unter', 'reserviert'] as const
type Filter = (typeof FILTER)[number]
const spalte = spaltenHelfer<LagerZeile>()

/**
 * Lager Bulle: Bestand, für Projekte reserviert, frei, unterwegs (bestellt) und Mindestmenge.
 * Ein Klick öffnet die Buchung; «Nachbestellen» legt Entwürfe für alles unter der Mindestmenge an.
 */
export function Lager({ onBestellung }: { onBestellung: (id: string) => void }) {
  const { t } = useTranslation()
  const lager = useLager()
  const lagerort = useLagerorte().data?.[0]
  const { laeuft, aus } = useAktion()
  const [filter, setFilter] = useState<Filter>('alle')
  const [suche, setSuche] = useState('')
  const [buchen, setBuchen] = useState<LagerZeile | 'neu' | null>(null)
  const unter = (lager.data ?? []).filter((z) => z.unter_mindest)

  const spalten = useMemo(
    () =>
      spalte.columns([
        spalte.accessor('artikel', {
          header: t('einkauf.lager.artikel'),
          cell: (c) => (
            <span className="flex max-w-[24rem] min-w-0 flex-col">
              <span className="line-clamp-2 font-medium">{c.getValue()}</span>
              <span className="text-muted-foreground line-clamp-2 text-xs">{c.row.original.artikelnummer}</span>
            </span>
          ),
        }),
        spalte.accessor('menge', {
          header: t('einkauf.lager.bestand'),
          cell: (c) => <span className="zahlen">{formatMenge(c.getValue())}</span>,
        }),
        spalte.accessor('reserviert', {
          header: t('einkauf.lager.reserviert'),
          cell: (c) => <span className="zahlen">{formatMenge(c.getValue())}</span>,
          meta: { nurBreit: true },
        }),
        spalte.accessor('frei', {
          header: t('einkauf.lager.frei'),
          cell: (c) =>
            c.row.original.unter_mindest ? (
              <Badge ton="warnung">{formatMenge(c.getValue())}</Badge>
            ) : (
              <span className="zahlen">{formatMenge(c.getValue())}</span>
            ),
        }),
        spalte.accessor('unterwegs', {
          header: t('einkauf.lager.unterwegs'),
          cell: (c) => <span className="zahlen">{c.getValue() ? formatMenge(c.getValue()) : '–'}</span>,
          meta: { nurBreit: true },
        }),
        spalte.accessor((z) => z.mindestmenge ?? -1, {
          id: 'mindest',
          header: t('einkauf.lager.mindest'),
          cell: (c) => (
            <span className="zahlen">
              {c.row.original.mindestmenge === null ? '–' : formatMenge(c.row.original.mindestmenge)}
            </span>
          ),
          meta: { nurBreit: true },
        }),
      ]),
    [t],
  )
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (lager.data ?? []).filter(
      (z) =>
        (filter === 'alle' || (filter === 'unter' ? z.unter_mindest : z.reserviert > 0)) &&
        (!s || `${z.artikel} ${z.artikelnummer ?? ''}`.toLowerCase().includes(s)),
    )
  }, [lager.data, filter, suche])

  const auffuellen = () =>
    void aus(async () => {
      if (!lagerort) return
      const r = await nachbestellen(lagerort.id)
      melde(r.bestellungen.length ? 'ok' : 'info', {
        de: `${String(r.bestellungen.length)} Entwürfe angelegt${r.ohne_lieferant ? `, ${String(r.ohne_lieferant)} ohne Lieferant` : ''}`,
        fr: `${String(r.bestellungen.length)} brouillon(s) créé(s)${r.ohne_lieferant ? `, ${String(r.ohne_lieferant)} sans fournisseur` : ''}`,
      })
      const erste = r.bestellungen[0]
      if (erste) onBestellung(erste)
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('einkauf.filter')}
          optionen={FILTER.map((f) => ({
            wert: f,
            text: t(`einkauf.lager.filter.${f}`),
            ...(f === 'unter' ? { anzahl: unter.length } : {}),
          }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as Filter)
          }}
        />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            type="search"
            className="w-full sm:w-56"
            aria-label={t('einkauf.lager.suche')}
            placeholder={t('einkauf.lager.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
          <Button variant="secondary" laedt={laeuft} disabled={unter.length === 0} onClick={auffuellen}>
            <ListPlus />
            {t('einkauf.lager.nachbestellen')}
          </Button>
          <Button
            onClick={() => {
              setBuchen('neu')
            }}
          >
            <Plus />
            {t('einkauf.lager.buchen')}
          </Button>
        </div>
      </div>
      {lager.error ? (
        <Fehlerzustand details={String(lager.error)} onNochmal={() => void lager.refetch()} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={lager.isPending}
          kennung={(z) => z.id}
          onOeffnen={setBuchen}
          beschriftung={lagerort?.name ?? t('einkauf.reiter.lager')}
          leer={<Leerzustand icon={Warehouse} titel={t('einkauf.lager.leer')} text={t('einkauf.lager.leerText')} />}
        />
      )}
      {buchen && lagerort && (
        <LagerBuchenDialog
          lagerortId={lagerort.id}
          zeile={buchen === 'neu' ? null : buchen}
          onSchliessen={() => {
            setBuchen(null)
          }}
        />
      )}
    </div>
  )
}
