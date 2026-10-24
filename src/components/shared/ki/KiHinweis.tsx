import { ShieldCheck, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useKiStatus } from '@/services/ki'

/**
 * Hinweis über jedem KI-Ergebnis: «Vorschlag, bitte prüfen» (Bau-Auftrag 3.4: KI schlägt vor, Mensch bestätigt).
 * Ist die KI nicht eingerichtet, ausgeschaltet oder das Tageslimit erreicht, steht das hier statt eines Fehlers.
 */
export function KiHinweis() {
  const { t } = useTranslation()
  const status = useKiStatus()
  const s = status.data
  const problem = !s ? null : !s.eingerichtet ? 'nichtEingerichtet' : !s.aktiv ? 'aus' : !s.budget.frei ? 'limit' : null
  if (problem) {
    return (
      <p className="bg-warn-soft text-warn flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t(`ki.status.${problem}`)}
      </p>
    )
  }
  return (
    <p className="bg-info-soft text-info flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
      <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {t('ki.regel')}
    </p>
  )
}
