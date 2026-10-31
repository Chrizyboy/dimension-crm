import { FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAblageOrdner } from '@/services/ablage'

/**
 * Ordner in SharePoint zur Offerte oder zum Projekt: Link zum Öffnen, solange er angelegt wird ein Hinweis,
 * bei Fehler eine Warnung. Ohne Ordner (ältere Offerte, Ablage aus) zeigt er nichts.
 */
export function AblageLink({ offerteId, projektId }: { offerteId?: string | null; projektId?: string | null }) {
  const { t } = useTranslation()
  const ordner = useAblageOrdner({ offerteId: offerteId ?? null, projektId: projektId ?? null }).data
  if (!ordner) return null
  if (ordner.fehler) {
    return (
      <Badge ton="warnung" punkt title={ordner.fehler}>
        {t('ablage.fehler')}
      </Badge>
    )
  }
  if (!ordner.url || !/^https:\/\//.test(ordner.url)) return <Badge punkt>{t('ablage.wirdAngelegt')}</Badge>
  return (
    <a
      href={ordner.url}
      target="_blank"
      rel="noreferrer noopener"
      className="text-accent-ink inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
    >
      <FolderOpen className="size-3.5" aria-hidden="true" />
      {ordner.stand === ordner.soll ? t('ablage.oeffnen') : t('ablage.wirdVerschoben')}
    </a>
  )
}
