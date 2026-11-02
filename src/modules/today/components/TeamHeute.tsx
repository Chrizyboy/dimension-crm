import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { supabase } from '@/services/supabase'
import { ladeTeamHeute } from '../services/meinTag'
import type { TeamPerson } from '../types'

const TON: Record<TeamPerson['status'], 'info' | 'warnung' | 'neutral' | 'ok'> = {
  baustelle: 'info',
  kunde: 'info',
  service: 'info',
  abwesend: 'neutral',
  da: 'ok',
}

/** Was unter dem Namen steht: Ort, Uhrzeit, Projekt- oder Fallnummer. Abwesend ohne Grund (M4 A). */
function zusatz(p: TeamPerson, t: TFunction): string {
  if (p.status === 'abwesend') return p.halbtag ? t('tag.teamHeute.halbtag') : ''
  if (p.status === 'da') return p.standort ?? ''
  return [p.zeit, p.nummer, p.ort].filter(Boolean).join(' · ')
}

/**
 * «Team heute» (M4 A, für alle): wer ist auf der Baustelle, beim Kunden, im Service, im Büro oder abwesend.
 * Eigene Abfrage (`team_heute`), alle 5 Minuten neu.
 */
export function TeamHeute() {
  const { t } = useTranslation()
  const team = useQuery({
    queryKey: ['team-heute'],
    queryFn: ladeTeamHeute,
    enabled: supabase !== null,
    refetchInterval: 300_000,
  })
  if (!team.data || team.data.length === 0) return null

  return (
    <Karte className="flex flex-col" data-testid="tag-team">
      <KarteKopf>
        <KarteTitel className="flex items-center gap-2">
          <Users className="text-muted-foreground size-4" aria-hidden="true" />
          {t('tag.teamHeute.titel')}
        </KarteTitel>
      </KarteKopf>
      <ul className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
        {team.data.map((p) => (
          <li key={p.id} className="bg-surface-2 flex min-w-0 flex-col gap-0.5 rounded-md border px-3 py-2 text-sm">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{p.name}</span>
              <Badge ton={TON[p.status]}>{t(`tag.teamHeute.${p.status}`)}</Badge>
            </span>
            <span className="text-muted-foreground truncate text-xs">{zusatz(p, t) || ' '}</span>
          </li>
        ))}
      </ul>
    </Karte>
  )
}
