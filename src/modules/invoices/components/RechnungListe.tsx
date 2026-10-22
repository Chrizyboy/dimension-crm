import { Download, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatChf } from '@/lib/format'
import { useRechnungen } from '../hooks/useRechnungen'
import { herunterladen, heuteZuerich, rechnungenCsv } from '../lib/rechnung'
import { RECHNUNG_FILTER, type RechnungFilter } from '../types'
import { rechnungSpalten } from './rechnungSpalten'

/** Liste der Rechnungen mit Filtern (offen, überfällig, Entwürfe, bezahlt, alle), Suche und «Liste exportieren». */
export function RechnungListe({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState<RechnungFilter>('offen')
  const [suche, setSuche] = useState('')
  const liste = useRechnungen(filter)
  const spalten = useMemo(() => rechnungSpalten(t), [t])
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? []).filter(
      (r) =>
        !s ||
        `${r.nummer ?? ''} ${r.kunde} ${r.kundennummer ?? ''} ${r.projekt_nummer ?? ''} ${r.titel}`
          .toLowerCase()
          .includes(s),
    )
  }, [liste.data, suche])
  const offen = daten
    .filter((r) => r.status === 'gestellt' || r.status === 'teilbezahlt')
    .reduce((s, r) => s + r.offen_rappen, 0)

  function exportieren() {
    const sprache = i18n.language === 'fr' ? 'fr' : 'de'
    herunterladen(
      rechnungenCsv(daten, sprache, {
        art: (a) => t(`rechnungen.art.${a}`),
        status: (s) => t(`rechnungen.status.${s}`),
      }),
      `${t('rechnungen.dateiname')}-${heuteZuerich()}.csv`,
      'text/csv;charset=utf-8',
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('rechnungen.filter')}
          optionen={RECHNUNG_FILTER.map((f) => ({ wert: f, text: t(`rechnungen.filterwert.${f}`) }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as RechnungFilter)
          }}
        />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            type="search"
            className="w-full sm:w-64"
            aria-label={t('rechnungen.suche')}
            placeholder={t('rechnungen.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
          <Button variant="secondary" disabled={daten.length === 0} onClick={exportieren}>
            <Download />
            {t('rechnungen.export')}
          </Button>
        </div>
      </div>
      {offen > 0 && (
        <p className="text-muted-foreground text-sm">
          {t('rechnungen.summeOffen', { betrag: formatChf(offen, { mitWaehrung: true }) })}
        </p>
      )}
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(r) => r.id}
          aktiveId={aktiveId}
          onOeffnen={(r) => {
            onOeffnen(r.id)
          }}
          beschriftung={t('rechnungen.reiter.rechnungen')}
          leer={<Leerzustand icon={ReceiptText} titel={t('rechnungen.leer')} text={t('rechnungen.leerText')} />}
        />
      )}
    </div>
  )
}
