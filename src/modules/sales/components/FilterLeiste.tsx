import { Search, X } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useTaste } from '@/hooks/useTaste'
import { useAussendienst, useRegionen } from '../hooks/useVerkauf'
import { LEERER_FILTER, type VerkaufFilter } from '../types'

interface FilterLeisteProps {
  filter: VerkaufFilter
  onChange: (f: VerkaufFilter) => void
  /** Anzahl Treffer rechts, z. B. «42 Geschäfte». */
  anzahl?: string
}

const ALLE = '_alle'

/**
 * Filter über Pipeline, Liste und Regionen (V233: Suche, Region Alle/Muri/Bulle, Person, Quelle, Tour).
 * Leer heisst «alle»; «Zurücksetzen» erscheint erst, wenn etwas gefiltert ist.
 */
export function FilterLeiste({ filter, onChange, anzahl }: FilterLeisteProps) {
  const { t } = useTranslation()
  const personen = useAussendienst()
  const regionen = useRegionen()
  const quellen = useAuswahl('quelle')
  const suchfeld = useRef<HTMLInputElement>(null)
  useTaste('/', () => suchfeld.current?.focus())
  const gefiltert = JSON.stringify(filter) !== JSON.stringify(LEERER_FILTER)
  const eins = (liste: string[]) => liste[0] ?? ALLE
  const setze = (feld: keyof Omit<VerkaufFilter, 'suche'>) => (w: string) => {
    onChange({ ...filter, [feld]: w === ALLE ? [] : [w] })
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="relative lg:w-72">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4"
          aria-hidden="true"
        />
        <Input
          ref={suchfeld}
          type="search"
          value={filter.suche}
          onChange={(e) => {
            onChange({ ...filter, suche: e.target.value })
          }}
          placeholder={t('verkauf.suche')}
          aria-label={t('verkauf.suche')}
          className="pr-8 pl-8"
        />
        <Kbd className="absolute top-1.5 right-1.5">/</Kbd>
      </div>
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
          setze('standorte')(w[0] ?? ALLE)
        }}
      />
      <div className="grid grid-cols-3 gap-2 lg:flex">
        <Auswahl
          aria-label={t('verkauf.person')}
          className="lg:w-40"
          value={eins(filter.personen)}
          onValueChange={setze('personen')}
          optionen={[
            { wert: ALLE, text: t('verkauf.allePersonen') },
            ...(personen.data ?? []).map((p) => ({ wert: p.id, text: p.vorname })),
          ]}
        />
        <Auswahl
          aria-label={t('verkauf.quelle')}
          className="lg:w-40"
          value={eins(filter.quellen)}
          onValueChange={setze('quellen')}
          optionen={[
            { wert: ALLE, text: t('verkauf.alleQuellen') },
            ...quellen.werte.map((q) => ({ wert: q.schluessel, text: quellen.text(q.schluessel) })),
          ]}
        />
        <Auswahl
          aria-label={t('verkauf.region')}
          className="lg:w-48"
          value={eins(filter.regionen)}
          onValueChange={setze('regionen')}
          optionen={[
            { wert: ALLE, text: t('verkauf.alleRegionen') },
            ...(regionen.data ?? []).map((r) => ({ wert: r.id, text: `${r.nummer ?? ''} ${r.name}`.trim() })),
          ]}
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
      {anzahl && (
        <p className="text-muted-foreground text-sm lg:ml-auto" aria-live="polite">
          {anzahl}
        </p>
      )}
    </div>
  )
}
