import { Calculator, Search, Trash2 } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { usePreisAenderung } from '../hooks/usePreise'
import { entferneKalkulation } from '../services/kalkulationen'
import type { Kalkulation } from '../types'

type Gespeichert = Kalkulation & { id: string; totalRappen: number | null; offerteNummer: string | null }

/** Gespeicherte Kalkulationen mit Suche; Entfernen legt sie in den Papierkorb (zweimal klicken). */
export function GespeicherteKalkulationen({
  kalkulationen,
  laedt,
  aktiveId,
  onOeffnen,
  onEntfernt,
}: {
  kalkulationen: Gespeichert[]
  laedt: boolean
  aktiveId: string | null
  onOeffnen: (k: Gespeichert) => void
  onEntfernt: (id: string) => void
}) {
  const { t } = useTranslation()
  const [suche, setSuche] = useState('')
  const [sicher, setSicher] = useState<string | null>(null)
  const s = useDeferredValue(suche).toLowerCase()
  const entfernen = usePreisAenderung(entferneKalkulation)
  const sichtbar = kalkulationen.filter((k) => !s || `${k.titel} ${k.offerteNummer ?? ''}`.toLowerCase().includes(s))

  async function weg(k: Gespeichert) {
    if (sicher !== k.id) {
      setSicher(k.id)
      return
    }
    setSicher(null)
    try {
      await entfernen.mutateAsync(k.id)
      onEntfernt(k.id)
      melde('ok', zweisprachig('preise.kalk.entfernt', { titel: k.titel }))
    } catch (f) {
      meldeFehler(f, 'preise.kalkulation')
      melde('kritisch', zweisprachig('fachfehler.allgemein'))
    }
  }

  return (
    <section aria-labelledby="kalk-gespeichert" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="kalk-gespeichert" className="text-base font-semibold">
          {t('preise.kalk.gespeichertTitel')}
          <span className="text-muted-foreground ml-2 font-mono text-xs">{kalkulationen.length}</span>
        </h2>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">{t('preise.kalk.sucheGespeichert')}</span>
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={suche}
            placeholder={t('preise.kalk.sucheGespeichert')}
            className="pl-8"
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        </label>
      </div>
      {laedt ? (
        <Skelett className="h-24" />
      ) : sichtbar.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('preise.kalk.keineGespeichert')}</p>
      ) : (
        <ul className="bg-surface divide-y rounded-xl border">
          {sichtbar.map((k) => (
            <li
              key={k.id}
              className={cn('flex items-center gap-2 px-3 py-2', k.id === aktiveId && 'bg-accent-soft/40')}
            >
              <button
                type="button"
                className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 rounded text-left outline-none focus-visible:ring-2"
                onClick={() => {
                  onOeffnen(k)
                }}
              >
                <Calculator className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{k.titel || '–'}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {[
                      k.offerteNummer,
                      k.geaendertAm ? formatDatum(k.geaendertAm) : null,
                      t('preise.kalk.positionen', { count: k.positionen.length }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="zahlen font-mono text-[13px]">{k.totalRappen ? formatChf(k.totalRappen) : ''}</span>
              </button>
              <Button
                size="icon"
                variant="ghost"
                className={sicher === k.id ? 'text-bad' : undefined}
                aria-label={t(sicher === k.id ? 'preise.kalk.entfernenFrage' : 'preise.kalk.entfernenKalk', {
                  titel: k.titel,
                })}
                title={t(sicher === k.id ? 'preise.kalk.entfernenFrage' : 'preise.kalk.entfernenKalk', {
                  titel: k.titel,
                })}
                onClick={() => void weg(k)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
