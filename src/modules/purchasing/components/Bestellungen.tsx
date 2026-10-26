import { Plus, ShoppingCart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useBestellungen } from '../hooks/useEinkauf'
import { BESTELL_FILTER, type BestellFilter } from '../types'
import { bestellSpalten } from './bestellSpalten'
import { NeueBestellungDialog } from './NeueBestellungDialog'

/** Liste der Bestellungen mit Filtern (offen, Entwürfe, überfällig, geliefert, alle) und «Neue Bestellung». */
export function Bestellungen({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<BestellFilter>('offen')
  const [suche, setSuche] = useState('')
  const [neu, setNeu] = useState(false)
  const liste = useBestellungen(filter)
  const status = useAuswahl('bestellstatus')
  const spalten = useMemo(
    () => bestellSpalten(t, (w) => ({ text: status.text(w), farbe: status.finde(w)?.farbe ?? null })),
    [t, status],
  )
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? []).filter(
      (b) =>
        !s ||
        `${b.nummer} ${b.lieferant} ${b.projekt_nummer ?? ''} ${b.kunde ?? ''} ${b.objekt_ort ?? ''}`
          .toLowerCase()
          .includes(s),
    )
  }, [liste.data, suche])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('einkauf.filter')}
          optionen={BESTELL_FILTER.map((f) => ({ wert: f, text: t(`einkauf.filterwert.${f}`) }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as BestellFilter)
          }}
        />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            type="search"
            className="w-full sm:w-80"
            aria-label={t('einkauf.suche')}
            placeholder={t('einkauf.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
          <Button
            onClick={() => {
              setNeu(true)
            }}
          >
            <Plus />
            {t('einkauf.neu')}
          </Button>
        </div>
      </div>
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(b) => b.id}
          aktiveId={aktiveId}
          onOeffnen={(b) => {
            onOeffnen(b.id)
          }}
          beschriftung={t('einkauf.reiter.bestellungen')}
          leer={<Leerzustand icon={ShoppingCart} titel={t('einkauf.leer')} text={t('einkauf.leerText')} />}
        />
      )}
      {neu && (
        <NeueBestellungDialog
          onSchliessen={() => {
            setNeu(false)
          }}
          onAngelegt={(id) => {
            setNeu(false)
            onOeffnen(id)
          }}
        />
      )}
    </div>
  )
}
