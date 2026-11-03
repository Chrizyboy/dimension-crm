import { useTranslation } from 'react-i18next'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { laufzeit } from '../lib/liste'
import { mindestBis } from '../lib/tarif'
import type { Vertrag } from '../types'

/**
 * Laufzeit auf einen Blick, nach den Bedingungen der Website: Beginn, Ende der Mindestlaufzeit, aktuelles
 * Vertragsjahr bis, letzter Tag für eine Kündigung. Gekündigt: Eingang und Ende.
 */
export function LaufzeitLeiste({ vertrag: v, heute, monate }: { vertrag: Vertrag; heute: string; monate: number }) {
  const { t } = useTranslation()
  const l = laufzeit(v, heute, monate)
  const mindest = mindestBis(v.start_am, v.laufzeit_jahre)
  const schritte: { titel: string; datum: string | null; stand: 'fertig' | 'jetzt' | 'offen'; zusatz?: string }[] = [
    { titel: t('wartung.laufzeit.beginn'), datum: v.start_am, stand: 'fertig' },
    { titel: t('wartung.laufzeit.mindest'), datum: mindest, stand: mindest && mindest < heute ? 'fertig' : 'jetzt' },
    ...(v.gekuendigt_per
      ? [
          {
            titel: v.gekuendigt_am ? t('wartung.laufzeit.eingegangen', { datum: formatDatum(v.gekuendigt_am) }) : '',
            datum: null,
            stand: 'fertig' as const,
          },
          { titel: t('wartung.laufzeit.gekuendigt'), datum: v.gekuendigt_per, stand: 'jetzt' as const },
        ]
      : [
          {
            titel: t('wartung.laufzeit.laeuft'),
            datum: l.bis,
            stand: mindest && mindest < heute ? ('jetzt' as const) : ('offen' as const),
          },
          {
            titel: t('wartung.laufzeit.kuendbar'),
            datum: l.kuendbar,
            stand: 'offen' as const,
            // Frist fürs laufende Jahr vorbei: zeigen, auf welches Ende die Kündigung dann gilt.
            ...(l.per && l.per !== l.bis ? { zusatz: t('wartung.laufzeit.per', { datum: formatDatum(l.per) }) } : {}),
          },
        ]),
  ]
  if (!v.start_am) return null
  return (
    <ol className="flex overflow-x-auto rounded-lg border">
      {schritte.map((s) => (
        <li
          key={s.titel}
          className={cn(
            'flex min-w-28 flex-1 flex-col gap-0.5 border-r px-3 py-2 text-xs last:border-r-0',
            s.stand === 'fertig' && 'bg-ok-soft text-ok',
            s.stand === 'jetzt' && 'bg-accent-soft text-accent-ink font-medium',
          )}
        >
          <span>{s.titel}</span>
          {s.datum && <span className="zahlen">{formatDatum(s.datum)}</span>}
          {s.zusatz && <span className="text-muted-foreground">{s.zusatz}</span>}
        </li>
      ))}
    </ol>
  )
}
