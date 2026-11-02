import { useQueryClient } from '@tanstack/react-query'
import { HardHat, Square } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { melde } from '@/services/meldungen'
import { useTag } from '../hooks/useBaustelle'
import { pflichtPause } from '../lib/arbeitsgesetz'
import { heute, plusTage, zuerich } from '../lib/zeit'
import { teamStoppen } from '../services/monteur'
import type { Rapport, TeamPerson } from '../types'

/**
 * Teamzeit im Rapport: wer heute dabei ist, wann der Sicherheits-Check war, und «Feierabend fürs Team» mit Pause.
 * Die Pause ist nach Arbeitsgesetz vorgeschlagen (ab 5½ h 15 Min., ab 7 h 30 Min., ab 9 h 60 Min.).
 */
export function TeamZeitAbschnitt({
  rapport: r,
  team,
  offen,
}: {
  rapport: Rapport
  team: TeamPerson[]
  offen: boolean
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const von = heute()
  const tag = useTag(von, plusTage(von, 6), null)
  const laufend = tag.data?.laufend?.rapport_id === r.id ? tag.data.laufend : null
  const stunden = laufend ? (Date.now() - new Date(laufend.start).getTime()) / 3_600_000 : 0
  const [pause, setPause] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const vorschlag = pflichtPause(stunden, 0)
  const namen = r.team.length ? r.team : team.map((p) => p.name)

  async function feierabend() {
    setLaeuft(true)
    try {
      await teamStoppen(r.id, Number(pause ?? vorschlag) || 0)
      await qc.invalidateQueries({ queryKey: ['baustelle'] })
      melde('ok', { de: 'Feierabend gebucht', fr: 'Fin de journée enregistrée' })
    } catch {
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <AkteAbschnitt titel={t('baustelle.team.titel')} zusatz={namen.length ? String(namen.length) : undefined}>
      <div className="flex flex-col gap-3 text-sm">
        {namen.length > 0 && <p>{namen.join(', ')}</p>}
        {r.sicherheit && (
          <p className="text-ok flex items-center gap-1.5">
            <HardHat className="size-4" aria-hidden="true" />
            {t('baustelle.team.check', { zeit: zuerich(r.sicherheit.am).zeit })}
          </p>
        )}
        {offen && laufend && (
          <div className="flex flex-wrap items-end gap-2">
            <Feld id={`pause-${r.id}`} label={t('baustelle.team.pause')}>
              <Input
                id={`pause-${r.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                className="w-28"
                value={pause ?? String(vorschlag)}
                onChange={(e) => {
                  setPause(e.target.value)
                }}
              />
            </Feld>
            <Button size="lg" variant="secondary" laedt={laeuft} onClick={() => void feierabend()}>
              <Square />
              {t('baustelle.team.feierabend')}
            </Button>
            <p className="text-muted-foreground w-full text-xs">{t('baustelle.team.pauseHinweis')}</p>
          </div>
        )}
      </div>
    </AkteAbschnitt>
  )
}
