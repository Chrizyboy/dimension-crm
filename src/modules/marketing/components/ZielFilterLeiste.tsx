import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Auswahl } from '@/components/ui/auswahl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { GRUPPEN, type Gruppe, type ZielFilter } from '../types'

const ALLE = '_alle'

/**
 * Filter der Zielgruppe wie V233: Suche, Gruppe und Kanton als Chips mit Anzahl, Sprache, Standort, Kontaktweg,
 * Anlage (ohne Batterie, ohne Wallbox, ohne Wärmepumpe, älter als 3 Jahre) und «Abgemeldete zeigen».
 */
export function ZielFilterLeiste({
  filter,
  onFilter,
  gruppen,
  kantone,
}: {
  filter: ZielFilter
  onFilter: (f: ZielFilter) => void
  gruppen: Map<string, number>
  kantone: Map<string, number>
}) {
  const { t } = useTranslation()
  const setze = <K extends keyof ZielFilter>(k: K, w: ZielFilter[K]) => {
    onFilter({ ...filter, [k]: w })
  }
  const wahl = (k: 'sprache' | 'standort' | 'kontakt' | 'anlage', werte: string[], praefix: string) => (
    <Auswahl
      aria-label={t(`marketing.filter.${k}`)}
      className="w-auto min-w-36"
      value={filter[k] || ALLE}
      onValueChange={(w) => {
        setze(k, (w === ALLE ? '' : w) as never)
      }}
      optionen={[
        { wert: ALLE, text: t(`marketing.filter.${k}Alle`) },
        ...werte.map((w) => ({ wert: w, text: t(`${praefix}.${w}`) })),
      ]}
    />
  )
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search
            className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            className="pl-8"
            aria-label={t('marketing.filter.suche')}
            placeholder={t('marketing.filter.suche')}
            value={filter.suche}
            onChange={(e) => {
              setze('suche', e.target.value)
            }}
          />
        </div>
        {wahl('sprache', ['de', 'fr'], 'marketing.sprache')}
        {wahl('standort', ['muri', 'bulle'], 'marketing.standort')}
        {wahl('kontakt', ['mail', 'post'], 'marketing.kontaktweg')}
        {wahl('anlage', ['ohne_batterie', 'ohne_wallbox', 'ohne_waermepumpe', 'alt'], 'marketing.anlage')}
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={filter.abgemeldete}
            onCheckedChange={(an) => {
              setze('abgemeldete', an)
            }}
          />
          {t('marketing.filter.abgemeldete')}
        </label>
      </div>
      <Filterchips
        beschriftung={t('marketing.filter.gruppe')}
        optionen={GRUPPEN.filter((g) => gruppen.has(g)).map((g) => ({
          wert: g,
          text: t(`marketing.gruppe.${g}`),
          anzahl: gruppen.get(g) ?? 0,
        }))}
        gewaehlt={filter.gruppen}
        onChange={(g) => {
          setze('gruppen', g as Gruppe[])
        }}
      />
      {kantone.size > 0 && (
        <Filterchips
          beschriftung={t('marketing.filter.kanton')}
          optionen={[...kantone.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([k, n]) => ({ wert: k, text: k, anzahl: n }))}
          gewaehlt={filter.kantone}
          onChange={(k) => {
            setze('kantone', k)
          }}
        />
      )}
    </div>
  )
}
