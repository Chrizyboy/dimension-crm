import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Filter } from '../types'

/** Kopfzahlen über der Liste; ein Klick setzt den passenden Filter. */
export function KopfZahlen({
  zahlen,
  onFilter,
}: {
  zahlen: { aktiv: number; wiederkehrend: number; faellig: number; rechnung: number; gekuendigt: number }
  onFilter: (f: Filter) => void
}) {
  const { t } = useTranslation()
  const kacheln: { f: Filter; zahl: string; text: string; ton?: 'warn' | 'bad' | 'ok' }[] = [
    { f: 'aktiv', zahl: String(zahlen.aktiv), text: t('wartung.kz.aktiv') },
    { f: 'aktiv', zahl: `CHF ${formatChf(zahlen.wiederkehrend)}`, text: t('wartung.kz.wiederkehrend'), ton: 'ok' },
    {
      f: 'faellig',
      zahl: String(zahlen.faellig),
      text: t('wartung.kz.faellig'),
      ...(zahlen.faellig ? { ton: 'warn' as const } : {}),
    },
    { f: 'rechnung', zahl: String(zahlen.rechnung), text: t('wartung.kz.rechnung') },
    {
      f: 'gekuendigt',
      zahl: String(zahlen.gekuendigt),
      text: t('wartung.kz.gekuendigt'),
      ...(zahlen.gekuendigt ? { ton: 'bad' as const } : {}),
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {kacheln.map((k) => (
        <button
          key={k.text}
          type="button"
          onClick={() => {
            onFilter(k.f)
          }}
          className="bg-surface hover:border-border-strong focus-visible:ring-ring flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left outline-none focus-visible:ring-2"
        >
          <span
            className={cn(
              'font-display zahlen text-xl font-semibold',
              k.ton === 'warn' && 'text-warn',
              k.ton === 'bad' && 'text-bad',
              k.ton === 'ok' && 'text-ok',
            )}
          >
            {k.zahl}
          </span>
          <span className="text-muted-foreground text-xs">{k.text}</span>
        </button>
      ))}
    </div>
  )
}
