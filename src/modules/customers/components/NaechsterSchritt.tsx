import { PhoneCall } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Schritt } from '../lib/naechsterSchritt'

const TON = {
  warn: 'bg-warn-soft text-warn',
  info: 'bg-info-soft text-info',
  ok: 'bg-ok-soft text-ok',
  neutral: 'bg-muted text-muted-foreground',
}

/** Hinweis «Was jetzt?» oben in der Kundenakte, mit direkter Aktion wo sinnvoll. */
export function NaechsterSchritt({ schritt, onAnrufen }: { schritt: Schritt | null; onAnrufen: () => void }) {
  const { t } = useTranslation()
  if (!schritt) return null
  const Icon = schritt.icon
  return (
    <div className="bg-surface flex items-start gap-3 rounded-lg border p-3">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TON[schritt.ton])}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{t('akte.wasJetzt')}</p>
        <p className="text-sm">{t(`akte.schritt.${schritt.schluessel}`, schritt.werte)}</p>
      </div>
      {schritt.anrufen && (
        <Button size="sm" variant="secondary" onClick={onAnrufen}>
          <PhoneCall />
          {t('akte.kontaktErfassen')}
        </Button>
      )}
    </div>
  )
}
