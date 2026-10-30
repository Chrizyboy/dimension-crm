import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import type { TagListe, TagZeile as Zeile } from '../types'
import { TagZeile } from './TagZeile'

/**
 * Karte einer Liste mit Anzahl. Zeigt höchstens `max` Zeilen; «Alle anzeigen» führt in den Bereich, der die
 * ganze Liste hat (z. B. Offerten → Nachfassen).
 */
export function TagKarte({
  icon: Icon,
  titel,
  liste,
  heute,
  alleZiel,
  max = 6,
  kopf,
  onAbhaken,
  testId,
}: {
  icon: LucideIcon
  titel: string
  liste: TagListe
  heute: string
  alleZiel?: string
  max?: number
  /** Zusätzliche Bedienung im Kopf (z. B. «Für mich | Von mir vergeben»). */
  kopf?: ReactNode
  onAbhaken?: (z: Zeile) => void
  testId?: string
}) {
  const { t } = useTranslation()
  return (
    <Karte className="flex flex-col overflow-hidden" data-testid={testId}>
      <KarteKopf className="flex flex-wrap items-center justify-between gap-2">
        <KarteTitel className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" aria-hidden="true" />
          {titel}
          <Badge ton={liste.anzahl > 0 ? 'marke' : 'neutral'}>{String(liste.anzahl)}</Badge>
        </KarteTitel>
        {kopf}
      </KarteKopf>
      {liste.anzahl === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('tag.nichts')}</p>
      ) : (
        <ul className="@container divide-y">
          {liste.zeilen.slice(0, max).map((z, i) => (
            <TagZeile
              key={`${z.aufgabe_id ?? z.id ?? ''}-${String(i)}`}
              zeile={z}
              heute={heute}
              {...(onAbhaken ? { onAbhaken } : {})}
            />
          ))}
        </ul>
      )}
      {liste.anzahl > max && alleZiel && (
        <a
          href={`#${alleZiel}`}
          className="text-primary dark:text-accent mt-auto border-t px-4 py-2 text-xs font-medium hover:underline"
        >
          {t('tag.alle', { count: liste.anzahl })}
        </a>
      )}
    </Karte>
  )
}
