import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import { dauer, kopfzahlen } from '../lib/anzeige'
import type { Mail } from '../types'

/**
 * Zahlen oben: wer auf uns wartet (davon über der Frist), Reaktionszeit heute (Mitte), still Abgelegtes.
 * Aus derselben Liste wie die Filter, damit Zahl und Liste übereinstimmen. Klick auf «warten» filtert. Am Handy nur
 * «warten», damit die Liste ohne Scrollen sichtbar bleibt.
 */
export function Kopfzahlen({ liste, onWarten }: { liste: Mail[]; onWarten: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const z = kopfzahlen(liste)
  const kachel = 'bg-surface flex flex-col gap-0.5 rounded-lg border px-4 py-3 text-left'
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={onWarten}
        className={cn(kachel, 'hover:bg-muted focus-visible:ring-ring outline-none focus-visible:ring-2')}
      >
        <span className={cn('font-display zahlen text-2xl font-semibold', z.ueber > 0 && 'text-bad')}>{z.warten}</span>
        <span className="text-muted-foreground text-xs">
          {t('posteingang.zahl.warten', { count: z.warten })}
          {z.ueber > 0 && ` · ${t('posteingang.zahl.ueber', { count: z.ueber })}`}
        </span>
      </button>
      <div className={cn(kachel, 'hidden sm:flex')}>
        <span className="font-display zahlen text-2xl font-semibold">
          {z.mitteHeute == null ? '–' : dauer(z.mitteHeute, sprache)}
        </span>
        <span className="text-muted-foreground text-xs">{t('posteingang.zahl.reaktion')}</span>
      </div>
      <div className={cn(kachel, 'hidden sm:flex')}>
        <span className="font-display zahlen text-2xl font-semibold">{z.abgelegt}</span>
        <span className="text-muted-foreground text-xs">{t('posteingang.zahl.abgelegt')}</span>
      </div>
    </div>
  )
}
