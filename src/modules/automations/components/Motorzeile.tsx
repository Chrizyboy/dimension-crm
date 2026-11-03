import { useTranslation } from 'react-i18next'
import { Karte } from '@/components/ui/karte'
import { formatRelativ } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import type { Uebersicht } from '../types'

/** Läuft der Motor? Der Zeitplan ruft ihn jede Minute; älter als 10 Minuten oder mit Fehler = rot. */
export function Motorzeile({ u, jetzt = new Date() }: { u: Uebersicht; jetzt?: Date }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const zuletzt = u.motor?.zuletzt_am ?? null
  const frisch = zuletzt !== null && jetzt.getTime() - new Date(zuletzt).getTime() < 10 * 60_000
  const ok = frisch && u.motor?.ok !== false
  return (
    <Karte className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3" data-testid="motor">
      <span className="flex items-center gap-2 font-semibold">
        <span
          className={cn('size-2.5 rounded-full', ok ? 'bg-ok ring-ok-soft' : 'bg-bad ring-bad-soft', 'ring-4')}
          aria-hidden="true"
        />
        {ok ? t('automationen.uebersicht.motorOk') : t('automationen.uebersicht.motorStill')}
      </span>
      <span className="text-muted-foreground text-sm">
        {zuletzt
          ? t('automationen.uebersicht.motorZuletzt', { zeit: formatRelativ(zuletzt, sprache, jetzt) })
          : t('automationen.uebersicht.motorNie')}
        {u.motor?.ok === false && u.motor.meldung ? ` · ${u.motor.meldung}` : ''}
      </span>
      <span className="text-muted-foreground text-sm">
        {t('automationen.uebersicht.aktivVon', { aktiv: u.aktiv, alle: u.alle })}
      </span>
      <span className="text-muted-foreground text-sm">
        {t('automationen.uebersicht.wartend', { count: u.wartend })}
      </span>
    </Karte>
  )
}
