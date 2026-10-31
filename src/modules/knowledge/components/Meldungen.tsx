import { LifeBuoy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useHelpdeskStand, useMeldungen } from '../hooks/useHandbuch'
import { istOffen } from '../lib/handbuch'
import { HelpdeskEinstellung } from './HelpdeskEinstellung'
import { MeldungKarte } from './MeldungKarte'

type Filter = 'offen' | 'erledigt' | 'alle'

/**
 * Meldungen (V233 Helpdesk-Tickets): jede Person sieht ihre Meldungen und die Antworten, die Administration
 * alle und setzt Status und Antwort. Neueste zuerst, offene zuerst gefiltert.
 */
export function Meldungen({ admin, offen: offenId }: { admin: boolean; offen: string | null }) {
  const { t } = useTranslation()
  const daten = useMeldungen()
  const stand = useHelpdeskStand(admin)
  const ichEntscheide = stand.data?.ich_entscheide ?? false
  const [filter, setFilter] = useState<Filter>('offen')
  const alle = useMemo(() => daten.data ?? [], [daten.data])
  const zahl = (f: Filter) => alle.filter((m) => f === 'alle' || (f === 'offen' ? istOffen(m) : !istOffen(m))).length
  // Eine verlinkte Meldung (aus der Glocke) ist immer sichtbar, auch wenn sie schon erledigt ist.
  const liste = alle.filter(
    (m) => m.id === offenId || filter === 'alle' || (filter === 'offen' ? istOffen(m) : !istOffen(m)),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-sm">
          {admin ? t('handbuch.meldungen.introAdmin') : t('handbuch.meldungen.intro')}
        </p>
        <Filterchips
          einzeln
          beschriftung={t('handbuch.meldungen.filter')}
          optionen={(['offen', 'erledigt', 'alle'] as const).map((f) => ({
            wert: f,
            text: t(`handbuch.meldungen.filterWert.${f}`),
            anzahl: zahl(f),
          }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f === 'offen' || f === 'erledigt' || f === 'alle') setFilter(f)
          }}
        />
      </div>
      {admin && <HelpdeskEinstellung />}
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !daten.data ? (
        <Skelett className="h-48" />
      ) : liste.length === 0 ? (
        <Leerzustand
          icon={LifeBuoy}
          titel={alle.length ? t('handbuch.meldungen.keineImFilter') : t('handbuch.meldungen.leer')}
          text={t('handbuch.meldungen.leerText')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {liste.map((m) => (
            <MeldungKarte
              key={m.id}
              meldung={m}
              admin={admin}
              ichEntscheide={ichEntscheide}
              hervorheben={m.id === offenId}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
