import { History } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { formatDatumZeit } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { useUi } from '@/stores/ui'
import { useAutomationen, useLaeufe } from '../hooks/useAutomationen'
import { OFFEN, STAND_TON } from '../lib/anzeige'
import type { Lauf, LaufStand } from '../types'
import { LaufDetail } from './LaufDetail'

const spalte = spaltenHelfer<Lauf>()

const FILTER: Record<string, LaufStand[]> = {
  offen: [...OFFEN],
  fertig: ['fertig'],
  uebersprungen: ['uebersprungen', 'abgebrochen'],
  fehler: ['fehler'],
}

interface Props {
  automationId: string | null
  onAutomation: (id: string | null) => void
}

/** Protokoll: jeder Lauf mit Stand; Klick zeigt die Schritte. Filter nach Automation und Stand. */
export function Protokoll({ automationId, onAutomation }: Props) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const [filter, setFilter] = useState<string>('alle')
  const [offen, setOffen] = useState<Lauf | null>(null)
  const automationen = useAutomationen()
  const laeufe = useLaeufe({ ...(automationId ? { automation_id: automationId } : {}), staende: FILTER[filter] ?? [] })
  const name = (id: string) => {
    const a = automationen.data?.find((x) => x.id === id)
    return a ? (sprache === 'fr' ? a.name_fr : a.name_de) : ''
  }

  const spalten = spalte.columns([
    spalte.accessor('erstellt_am', {
      header: t('automationen.protokoll.zeit'),
      cell: (c) => <span className="zahlen whitespace-nowrap">{formatDatumZeit(c.getValue())}</span>,
      meta: { breite: 'w-40' },
    }),
    spalte.accessor((l) => l.titel ?? '', {
      id: 'titel',
      header: t('automationen.protokoll.bezug'),
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.getValue() || t('automationen.protokoll.ohneTitel')}</span>
          <span className="text-muted-foreground truncate text-xs">{name(c.row.original.automation_id)}</span>
        </span>
      ),
    }),
    spalte.accessor('stand', {
      header: t('automationen.protokoll.stand'),
      cell: (c) => (
        <Badge ton={STAND_TON[c.getValue()]} punkt>
          {t(`automationen.stand.${c.getValue()}`)}
        </Badge>
      ),
      meta: { breite: 'w-32' },
    }),
    spalte.accessor((l) => (l.stand === 'wartet' ? l.weiter_am : ''), {
      id: 'weiter',
      header: t('automationen.protokoll.weiter'),
      cell: (c) =>
        c.getValue() ? <span className="zahlen text-xs whitespace-nowrap">{formatDatumZeit(c.getValue())}</span> : null,
      meta: { breite: 'w-40', nurBreit: true },
    }),
    spalte.accessor((l) => l.protokoll.length, {
      id: 'schritte',
      header: t('automationen.protokoll.schritte'),
      cell: (c) => (
        <span className="zahlen text-xs">
          {c.getValue()}
          {c.row.original.fehler > 0 && (
            <span className="text-bad"> · {t('automationen.fehlerZahl', { count: c.row.original.fehler })}</span>
          )}
        </span>
      ),
      meta: { breite: 'w-24', zahl: true, nurBreit: true },
    }),
  ])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Auswahl
          className="w-72"
          aria-label={t('automationen.protokoll.automation')}
          value={automationId ?? 'alle'}
          optionen={[
            { wert: 'alle', text: t('automationen.protokoll.alleAutomationen') },
            ...(automationen.data ?? []).map((a) => ({ wert: a.id, text: sprache === 'fr' ? a.name_fr : a.name_de })),
          ]}
          onValueChange={(v) => {
            onAutomation(v === 'alle' ? null : v)
          }}
        />
        <Filterchips
          einzeln
          beschriftung={t('automationen.protokoll.stand')}
          gewaehlt={[filter]}
          optionen={['alle', ...Object.keys(FILTER)].map((f) => ({
            wert: f,
            text: t(`automationen.protokoll.filter.${f}`),
          }))}
          onChange={([f]) => {
            setFilter(f ?? 'alle')
          }}
        />
      </div>
      <Datentabelle
        daten={laeufe.data ?? []}
        spalten={spalten}
        kennung={(l) => l.id}
        laedt={laeufe.isLoading}
        fehler={laeufe.error}
        onNochmal={() => void laeufe.refetch()}
        aktiveId={offen?.id ?? null}
        onOeffnen={setOffen}
        beschriftung={t('automationen.ansicht.protokoll')}
        leer={
          <Leerzustand
            icon={History}
            titel={t('automationen.protokoll.leerTitel')}
            text={t('automationen.protokoll.leerText')}
          />
        }
      />
      {offen && (
        <LaufDetail
          lauf={offen}
          automation={automationen.data?.find((a) => a.id === offen.automation_id)}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
