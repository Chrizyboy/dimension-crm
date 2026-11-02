import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Schritt } from '../../types'

const FOLGE = ['freigabe', 'ab_offen', 'unterwegs', 'eingang', 'rechnung', 'fertig'] as const

/** Leiste der Schritte einer Bestellung: Freigabe → AB → unterwegs → Eingang → Rechnung → fertig. */
export function Schritte({ schritt }: { schritt: Schritt }) {
  const { t } = useTranslation()
  if (schritt === 'storniert') return null
  const jetzt = FOLGE.indexOf(schritt)
  return (
    <ol className="flex flex-wrap gap-1 pb-3 text-xs" aria-label={t('einkauf.schritt.titel')}>
      {FOLGE.map((s, i) => (
        <li
          key={s}
          aria-current={i === jetzt ? 'step' : undefined}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-0.5',
            i < jetzt && 'bg-ok-soft border-transparent',
            i === jetzt && 'border-foreground font-semibold',
            i > jetzt && 'text-muted-foreground',
          )}
        >
          {i < jetzt && <Check className="size-3" aria-hidden="true" />}
          {t(`einkauf.schritt.${s}`)}
        </li>
      ))}
    </ol>
  )
}
