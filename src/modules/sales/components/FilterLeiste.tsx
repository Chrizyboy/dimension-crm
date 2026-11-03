import { X } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Suchfeld } from '@/components/shared/Werkzeugleiste'
import { Filterchips } from '@/components/shared/Filterchips'
import { MehrfachFilter } from '@/components/shared/MehrfachFilter'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useTaste } from '@/hooks/useTaste'
import { useAussendienst, useRegionen } from '../hooks/useVerkauf'
import { LEERER_FILTER, type VerkaufFilter } from '../types'

interface FilterLeisteProps {
  filter: VerkaufFilter
  onChange: (f: VerkaufFilter) => void
  /** Anzahl Treffer rechts, z. B. «42 Geschäfte». */
  anzahl?: string
  /** Weiterer Knopf vor der Anzahl, z. B. «Spalten» in der Pipeline. */
  zusatz?: ReactNode
}

const ALLE = '_alle'

/**
 * Filter über Pipeline, Liste und Regionen (V233: Suche, Region Alle/Muri/Bulle, Person, Quelle, Tour).
 * Person, Quelle und Region mit Häkchen (mehrere oder «alle ausser»). Leer heisst «alle»;
 * «Zurücksetzen» erscheint erst, wenn etwas gefiltert ist.
 */
export function FilterLeiste({ filter, onChange, anzahl, zusatz }: FilterLeisteProps) {
  const { t } = useTranslation()
  const personen = useAussendienst()
  const regionen = useRegionen()
  const quellen = useAuswahl('quelle')
  const suchfeld = useRef<HTMLInputElement>(null)
  useTaste('/', () => suchfeld.current?.focus(), true, t('kuerzel.suche'))
  const gefiltert = JSON.stringify(filter) !== JSON.stringify(LEERER_FILTER)
  const eins = (liste: string[]) => liste[0] ?? ALLE
  const setze = (feld: keyof Omit<VerkaufFilter, 'suche'>) => (w: string[]) => {
    onChange({ ...filter, [feld]: w })
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <Suchfeld
        ref={suchfeld}
        kuerzel="/"
        beschriftung={t('verkauf.suche')}
        value={filter.suche}
        onChange={(e) => {
          onChange({ ...filter, suche: e.target.value })
        }}
      />
      <Filterchips
        beschriftung={t('verkauf.standort')}
        einzeln
        optionen={[
          { wert: ALLE, text: t('verkauf.alle') },
          { wert: 'muri', text: 'Muri' },
          { wert: 'bulle', text: 'Bulle' },
        ]}
        gewaehlt={[eins(filter.standorte)]}
        onChange={(w) => {
          setze('standorte')(w[0] === ALLE || !w[0] ? [] : w)
        }}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
        <MehrfachFilter
          beschriftung={t('verkauf.person')}
          alleText={t('verkauf.allePersonen')}
          className="lg:w-40"
          gewaehlt={filter.personen}
          onChange={setze('personen')}
          optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.vorname }))}
        />
        <MehrfachFilter
          beschriftung={t('verkauf.quelle')}
          alleText={t('verkauf.alleQuellen')}
          className="lg:w-40"
          gewaehlt={filter.quellen}
          onChange={setze('quellen')}
          optionen={quellen.werte.map((q) => ({ wert: q.schluessel, text: quellen.text(q.schluessel) }))}
        />
        <MehrfachFilter
          beschriftung={t('verkauf.region')}
          alleText={t('verkauf.alleRegionen')}
          className="lg:w-48"
          gewaehlt={filter.regionen}
          onChange={setze('regionen')}
          optionen={(regionen.data ?? []).map((r) => ({ wert: r.id, text: `${r.nummer ?? ''} ${r.name}`.trim() }))}
        />
      </div>
      {gefiltert && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(LEERER_FILTER)
          }}
        >
          <X />
          {t('verkauf.zuruecksetzen')}
        </Button>
      )}
      {zusatz}
      {anzahl && (
        <p className="text-muted-foreground text-sm lg:ml-auto" aria-live="polite">
          {anzahl}
        </p>
      )}
    </div>
  )
}
