import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useIstAdmin } from '@/hooks/useIstAdmin'

/**
 * Hülle um Einstellungen der Firma: für die Administration unverändert, für alle anderen nur zum Lesen
 * (alle Felder und Knöpfe darin gesperrt) mit dem Hinweis, wer ändern kann. Eigenes (Profil, Signatur …)
 * gehört nicht hier hinein.
 */
export function NurAdministration({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const admin = useIstAdmin()
  if (admin) return <>{children}</>
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Lock className="size-4 shrink-0" aria-hidden />
        {t('allgemein.nurAdministration')}
      </p>
      {/* fieldset sperrt alle Eingaben darin auf einmal; «contents» lässt das Layout unverändert. */}
      <fieldset disabled className="contents">
        {children}
      </fieldset>
    </div>
  )
}
