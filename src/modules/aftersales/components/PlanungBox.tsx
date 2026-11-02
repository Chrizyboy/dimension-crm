import { CalendarClock, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatDatumZeit } from '@/lib/format'
import { usePersonen } from '../hooks/useService'
import { dauerText } from '../lib/reaktion'
import type { ServiceFall } from '../types'
import { Box } from './Box'
import { EinsatzDialog } from './EinsatzDialog'

/**
 * Einsatz des Falls auf einen Blick: wann, wie lange, wer leitet, wer kommt mit. «Planen» öffnet den Dialog mit
 * Hinweisen, wer an dem Tag schon abwesend oder anderswo eingeteilt ist. Der Termin erscheint im Zeitplan,
 * auf «Mein Tag» und am Handy aller Eingeteilten.
 */
export function PlanungBox({ f }: { f: ServiceFall }) {
  const { t } = useTranslation()
  const personen = usePersonen()
  const [offen, setOffen] = useState(false)
  const name = (id: string) => personen.data?.find((p) => p.id === id)?.name ?? '…'
  const leitung = f.person_id ? name(f.person_id) : null
  const team = f.team.map(name)
  return (
    <Box
      titel={t('service.planung.titel')}
      rechts={
        f.status !== 'erledigt' && (
          <Button
            size="sm"
            variant={f.termin_am ? 'ghost' : 'primary'}
            onClick={() => {
              setOffen(true)
            }}
          >
            <CalendarClock className="size-4" aria-hidden="true" />
            {f.termin_am ? t('service.planung.aendern') : t('service.planung.planen')}
          </Button>
        )
      }
    >
      {f.termin_am ? (
        <div className="flex flex-col gap-1">
          <span className="zahlen text-base font-semibold">{formatDatumZeit(f.termin_am)}</span>
          <span className="text-muted-foreground text-sm">
            {t('service.planung.dauer', { dauer: dauerText(f.dauer_minuten ?? 120) })}
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <Users className="text-muted-foreground size-4" aria-hidden="true" />
            {[leitung && t('service.planung.leitet', { name: leitung }), ...team].filter(Boolean).join(', ')}
          </span>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {leitung ? t('service.planung.ohneTerminMit', { name: leitung }) : t('service.planung.ohneTermin')}
        </p>
      )}
      {offen && (
        <EinsatzDialog
          f={f}
          onSchliessen={() => {
            setOffen(false)
          }}
        />
      )}
    </Box>
  )
}
