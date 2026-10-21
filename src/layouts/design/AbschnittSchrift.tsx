import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import { Abschnitt } from './Abschnitt'

/** Schriftgrössen und -familien. Nur diese Stufen verwenden, keine Zwischengrössen. */
export function AbschnittSchrift() {
  const { t } = useTranslation()
  const stufen = [
    {
      name: 'Titel 2xl · Schibsted Grotesk',
      klasse: 'font-display text-2xl font-semibold',
      text: t('design.schriftBeispielTitel'),
    },
    { name: 'Titel lg', klasse: 'font-display text-lg font-semibold', text: t('design.schriftBeispielAbschnitt') },
    { name: 'Text sm · Public Sans', klasse: 'text-sm', text: t('design.schriftBeispielText') },
    { name: 'Klein xs', klasse: 'text-xs text-muted-foreground', text: t('design.schriftBeispielKlein') },
    {
      name: 'Zahlen · JetBrains Mono',
      klasse: 'zahlen font-mono text-sm',
      text: `CHF ${formatChf(1_250_000)} · OF-2026-0412 · 9.8 kWp`,
    },
  ]
  return (
    <Abschnitt id="schrift" titel={t('design.schrift')} text={t('design.schriftText')}>
      <div className="bg-surface flex flex-col divide-y rounded-lg border">
        {stufen.map((s) => (
          <div key={s.name} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:items-baseline sm:gap-4">
            <span className="text-muted-foreground font-mono text-[11px]">{s.name}</span>
            <span className={`min-w-0 ${s.klasse}`}>{s.text}</span>
          </div>
        ))}
      </div>
    </Abschnitt>
  )
}
