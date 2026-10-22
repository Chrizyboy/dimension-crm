import { CalendarRange } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { usePersonen, useProjektEinsaetze, useSubunternehmer } from '../hooks/useProjekte'
import { werktage } from '../lib/zeitplan'
import type { Projekt } from '../types'
import { ZeitplanDialog } from './ZeitplanDialog'

const TON = { intern: 'info', extern: 'marke', geplant: 'neutral' } as const

/** Einsätze dieser Baustelle in der Akte, mit «Zeitplan bearbeiten». */
export function AkteZeitplan({ projekt }: { projekt: Projekt }) {
  const { t } = useTranslation()
  const einsaetze = useProjektEinsaetze(projekt.id)
  const personen = usePersonen()
  const subs = useSubunternehmer()
  const [offen, setOffen] = useState(false)
  const wer = (ids: string[]) => ids.map((id) => personen.data?.find((p) => p.id === id)?.name ?? '?').join(', ')

  return (
    <div className="flex flex-col gap-3 pt-2">
      {einsaetze.isPending ? (
        <Skelett className="h-24" />
      ) : (einsaetze.data ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('projekte.zeitplan.keineEinsaetze')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {(einsaetze.data ?? []).map((e) => (
            <li key={e.id} className="flex flex-col gap-1 px-3 py-2 text-sm">
              <span className="flex items-center justify-between gap-2">
                <span className="zahlen">
                  {formatDatum(e.von)} – {formatDatum(e.bis)}{' '}
                  <span className="text-muted-foreground text-xs">
                    {t('projekte.bau.werktage', { count: werktage(e.von, e.bis) })}
                  </span>
                </span>
                <Badge ton={TON[e.art]}>{t(`projekte.einsatz.${e.art}`)}</Badge>
              </span>
              <span className="text-muted-foreground text-xs">
                {[
                  e.subunternehmer_id ? subs.data?.find((s) => s.id === e.subunternehmer_id)?.name : null,
                  wer(e.personen),
                  e.notiz,
                ]
                  .filter(Boolean)
                  .join(' · ') || '–'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="secondary"
        className="self-start"
        onClick={() => {
          setOffen(true)
        }}
      >
        <CalendarRange />
        {t('projekte.zeitplan.bearbeiten')}
      </Button>
      {offen && (
        <ZeitplanDialog
          projekt={projekt}
          onSchliessen={() => {
            setOffen(false)
          }}
        />
      )}
    </div>
  )
}
