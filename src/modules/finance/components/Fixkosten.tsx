import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import type { Finanzdaten, Fixkosten as FixTyp } from '../types'

/**
 * Fixkosten (V233): wiederkehrende Kosten nach Gruppe, mit Rhythmus und Tag. Die Vorschau setzt jeden Termin
 * ein; bezahlt oder verschoben wird ein Termin in der Übersicht. Löhne bleiben verdeckt, bis man sie zeigt.
 */
export function Fixkosten({
  daten,
  lohnZeigen,
  onBearbeiten,
}: {
  daten: Finanzdaten
  lohnZeigen: boolean
  onBearbeiten: (f: FixTyp | null) => void
}) {
  const { t } = useTranslation()
  const gruppen = new Map<string, FixTyp[]>()
  for (const f of daten.fixkosten) {
    const g = f.gruppe ?? 'Sonstiges'
    gruppen.set(g, [...(gruppen.get(g) ?? []), f])
  }
  const proMonat = (f: FixTyp) =>
    (f.betrag_rappen ?? 0) / (f.rhythmus === 'quartal' ? 3 : f.rhythmus === 'jahr' ? 12 : 1)
  const betrag = (f: FixTyp, r: number) => (f.gruppe === 'Löhne' && !lohnZeigen ? '••••' : formatChf(Math.round(r)))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            onBearbeiten(null)
          }}
        >
          <Plus />
          {t('finanzen.fix.neu')}
        </Button>
      </div>
      {[...gruppen.entries()].map(([g, liste]) => (
        <AkteAbschnitt
          key={g}
          titel={g}
          zusatz={
            g === 'Löhne' && !lohnZeigen
              ? '••••'
              : t('finanzen.fix.proMonat', {
                  betrag: formatChf(Math.round(liste.filter((f) => f.aktiv).reduce((s, f) => s + proMonat(f), 0))),
                })
          }
        >
          <ul className="divide-y text-sm">
            {liste.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="hover:bg-surface-2 flex w-full flex-wrap items-center gap-x-3 gap-y-1 py-2 text-left"
                  onClick={() => {
                    onBearbeiten(f)
                  }}
                >
                  <span className="flex min-w-0 flex-1 basis-48 flex-col">
                    <span className={f.aktiv ? 'truncate font-medium' : 'text-muted-foreground truncate line-through'}>
                      {f.bezeichnung ?? '–'}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {[f.detail, f.standort, f.bis ? t('finanzen.fix.bis', { datum: formatDatum(f.bis) }) : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <Badge ton="neutral">
                    {t(`finanzen.fix.rhythmus.${f.rhythmus ?? 'monat'}`)} ·{' '}
                    {t('finanzen.fix.tag', { tag: f.tag ?? 25 })}
                  </Badge>
                  <span className="zahlen w-28 text-right">{betrag(f, f.betrag_rappen ?? 0)}</span>
                </button>
              </li>
            ))}
          </ul>
        </AkteAbschnitt>
      ))}
    </div>
  )
}
