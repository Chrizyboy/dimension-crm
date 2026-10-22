import { useQueryClient } from '@tanstack/react-query'
import { Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { useTag } from '../hooks/useBaustelle'
import { dauerText, heute, plusTage } from '../lib/zeit'
import { zeitStarten } from '../services/monteur'
import type { Rapport, ZeitArt } from '../types'
import { ZeitLaeuft } from './ZeitLaeuft'

/** Start/Stopp im Rapport: mehr braucht die Zeiterfassung nicht. Reise und Arbeit getrennt für den Lohn. */
export function RapportZeit({ rapport: r, offen }: { rapport: Rapport; offen: boolean }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const von = heute()
  const tag = useTag(von, plusTage(von, 6), null)
  const laufend = tag.data?.laufend
  const hier = laufend?.rapport_id === r.id

  async function start(art: ZeitArt) {
    await zeitStarten({ rapport_id: r.id, projekt_id: r.projekt_id, art })
    await qc.invalidateQueries({ queryKey: ['baustelle', 'tag'] })
  }

  return (
    <AkteAbschnitt
      titel={t('baustelle.zeit.titel')}
      zusatz={r.stunden ? dauerText(Math.round(r.stunden * 60)) : undefined}
    >
      {laufend && hier ? (
        <ZeitLaeuft laufend={laufend} />
      ) : offen && r.datum === von ? (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => void start('arbeit')}>
            <Play />
            {t('baustelle.zeit.startArbeit')}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => void start('reise')}>
            {t('baustelle.zeit.startReise')}
          </Button>
          {laufend && <p className="text-muted-foreground w-full text-xs">{t('baustelle.zeit.andereLaeuft')}</p>}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {r.stunden ? t('baustelle.zeit.erfasst', { dauer: dauerText(Math.round(r.stunden * 60)) }) : '–'}
        </p>
      )}
    </AkteAbschnitt>
  )
}
