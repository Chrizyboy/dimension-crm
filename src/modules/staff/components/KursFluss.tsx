import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Kurs } from '../types'

const SCHRITTE = ['beantragt', 'bewilligt', 'angemeldet', 'besucht'] as const

/** Weg eines Kurses: beantragt › bewilligt › angemeldet › besucht, mit wer und wann. Abgesagt ersetzt den Rest. */
export function KursFluss({ kurs }: { kurs: Kurs }) {
  const { t } = useTranslation()
  const jetzt = kurs.stand === 'abgesagt' ? -1 : SCHRITTE.indexOf(kurs.stand)
  const zusatz: Record<string, string | null> = {
    beantragt: kurs.beantragt_name,
    bewilligt: kurs.bewilligt_name,
    angemeldet: kurs.von ? formatDatum(kurs.von) : null,
    besucht: null,
  }
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label={t('team.kurs.standTitel')}>
      {SCHRITTE.map((s, i) => (
        <Fragment key={s}>
          {i > 0 && <ChevronRight className="text-muted-foreground size-3" aria-hidden="true" />}
          <li
            aria-current={i === jetzt ? 'step' : undefined}
            className={cn(
              'rounded-md border px-2 py-0.5',
              i < jetzt && 'bg-ok-soft text-ok border-transparent',
              i === jetzt && 'bg-accent-soft text-accent-ink border-transparent font-semibold',
            )}
          >
            {t(`team.kurs.stand.${s}`)}
            {i <= jetzt && zusatz[s] ? ` · ${zusatz[s]}` : ''}
          </li>
        </Fragment>
      ))}
      {kurs.stand === 'abgesagt' && (
        <li className="bg-bad-soft text-bad ml-1 rounded-md px-2 py-0.5 font-semibold">
          {t('team.kurs.stand.abgesagt')}
        </li>
      )}
    </ol>
  )
}
