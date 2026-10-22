import { Plus, Search } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf } from '@/lib/format'
import type { Artikel } from '../types'

/** Katalog der Kalkulation: Kategorie wählen, suchen und Artikel mit + ins Blatt legen (nochmals + erhöht die Menge). */
export function Katalog({ artikel, onDazu }: { artikel: Artikel[]; onDazu: (a: Artikel) => void }) {
  const { t } = useTranslation()
  const kategorien = useAuswahl('artikelkategorie')
  const [kategorie, setKategorie] = useState<string[]>(['module'])
  const [suche, setSuche] = useState('')
  const s = useDeferredValue(suche)
  const sichtbar = useMemo(() => {
    const woerter = s.toLowerCase().split(/\s+/).filter(Boolean)
    // Mit Suche über alle Kategorien, sonst nur die gewählte.
    return artikel
      .filter((a) =>
        woerter.length
          ? woerter.every((w) => a.suchtext.includes(w))
          : kategorie.length === 0 || kategorie.includes(a.kategorie),
      )
      .sort((a, b) => `${a.gruppe ?? ''} ${a.name}`.localeCompare(`${b.gruppe ?? ''} ${b.name}`, 'de-CH'))
  }, [artikel, kategorie, s])

  return (
    <section
      aria-label={t('preise.kalk.katalog')}
      className="bg-surface flex max-h-[44rem] flex-col gap-3 rounded-xl border p-3"
    >
      <label className="relative">
        <span className="sr-only">{t('preise.suche')}</span>
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={suche}
          placeholder={t('preise.kalk.sucheKatalog')}
          className="pl-8"
          onChange={(e) => {
            setSuche(e.target.value)
          }}
        />
      </label>
      <Filterchips
        einzeln
        beschriftung={t('preise.spalte.kategorie')}
        gewaehlt={kategorie}
        onChange={setKategorie}
        optionen={kategorien.werte
          .map((k) => ({
            wert: k.schluessel,
            text: kategorien.text(k.schluessel),
            anzahl: artikel.filter((a) => a.kategorie === k.schluessel).length,
          }))
          .filter((o) => o.anzahl > 0)}
      />
      <ul className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {sichtbar.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => {
                onDazu(a)
              }}
              className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left outline-none focus-visible:ring-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium" title={a.name}>
                  {a.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {[
                    a.gruppe,
                    a.leistungW ? `${a.leistungW} Wp` : null,
                    a.ekRappen !== null ? `EK ${formatChf(a.ekRappen)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <Plus className="text-muted-foreground size-4 shrink-0" aria-label={t('preise.kalk.dazu')} />
            </button>
          </li>
        ))}
        {sichtbar.length === 0 && <li className="text-muted-foreground p-2 text-sm">{t('preise.leer')}</li>}
      </ul>
    </section>
  )
}
