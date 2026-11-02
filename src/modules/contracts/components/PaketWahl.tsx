import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { stufeText, tarif } from '../lib/tarif'
import type { Katalog } from '../types'

/**
 * Die drei Pakete der Website als Karten zum Anklicken (Essentiel, Comfort, Premium), mit dem Preis für die
 * Anlagengrösse und den Leistungen in der Sprache der Person. Ein Klick wählt das Paket.
 */
export function PaketWahl({
  katalog,
  kwp,
  gewaehlt,
  onWahl,
}: {
  katalog: Katalog
  kwp: number | null
  gewaehlt: string | null
  onWahl: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const sprache = i18n.language === 'fr' ? 'fr' : 'de'
  const einheit = sprache === 'fr' ? 'kWc' : 'kWp'
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 flex w-full flex-wrap items-baseline justify-between gap-2 text-sm font-medium">
        <span>{t('wartung.feld.paket')}</span>
        <span className="text-muted-foreground text-xs font-normal">
          {t('wartung.paket.stufe', { stufe: stufeText(katalog.stufen_kwp, kwp, einheit) })}
        </span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {katalog.pakete.map((p) => {
          const an = gewaehlt === p.id
          const preis = tarif(katalog, p.id, kwp)
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={an}
              onClick={() => {
                onWahl(p.id)
              }}
              className={cn(
                'bg-surface hover:border-border-strong focus-visible:ring-ring flex flex-col gap-1.5 rounded-lg border p-3 text-left outline-none focus-visible:ring-2',
                an && 'border-accent ring-accent-soft ring-2',
              )}
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge ton={p.empfohlen ? 'marke' : 'neutral'}>
                  {p.art[sprache]}
                  {p.empfohlen ? ` · ${t('wartung.paket.empfohlen')}` : ''}
                </Badge>
                {an && <Check className="text-accent-ink ml-auto size-4" aria-hidden="true" />}
              </span>
              <span className="font-semibold">{p.name}</span>
              <span className="font-display zahlen text-xl font-semibold">
                {preis == null ? t('wartung.paket.aufAnfrage') : `CHF ${formatChf(preis)}`}
              </span>
              <span className="text-muted-foreground text-xs">{t('wartung.paket.proJahr')}</span>
              <span className="text-muted-foreground text-xs">
                {p.inspektion_monate
                  ? t('wartung.paket.inspektion', { count: p.inspektion_monate })
                  : t('wartung.paket.keineInspektion')}
              </span>
              <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-xs">
                {p.leistungen.map((l) => (
                  <li key={l.de}>{l[sprache]}</li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
