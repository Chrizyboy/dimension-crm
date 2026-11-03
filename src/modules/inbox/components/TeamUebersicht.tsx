import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/diverses'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import type { TFunction } from 'i18next'
import { useUi } from '@/stores/ui'
import { useTeam } from '../hooks/useArbeit'
import { dauer } from '../lib/anzeige'
import type { TeamZeile } from '../types'

const spalte = spaltenHelfer<TeamZeile>()

/** Spalten: Person (mit Abwesenheit und Vertretung), offen, über der Frist, zurückgestellt, warten auf Kunde, Reaktion. */
function teamSpalten(t: TFunction, sprache: 'de' | 'fr'): Spalten<TeamZeile> {
  const zahl = (n: number, rot = false) => (
    <span className={rot && n > 0 ? 'text-bad zahlen font-semibold' : 'zahlen'}>{n}</span>
  )
  return spalte.columns([
    spalte.accessor('name', {
      header: t('posteingang.team.person'),
      cell: (c) => (
        <span className="flex items-center gap-2">
          <Avatar name={c.getValue()} className="size-7 text-xs" />
          <span className="flex flex-col">
            <span className="font-medium">{c.getValue()}</span>
            {c.row.original.abwesend && (
              <span className="text-muted-foreground text-xs">
                {c.row.original.vertretung
                  ? t('posteingang.team.vertreten', { name: c.row.original.vertretung })
                  : t('posteingang.team.abwesend')}
              </span>
            )}
          </span>
          {c.row.original.abwesend && <Badge ton="warnung">{t('posteingang.team.weg')}</Badge>}
        </span>
      ),
    }),
    spalte.accessor('offen', { header: t('posteingang.team.offen'), cell: (c) => zahl(c.getValue()) }),
    spalte.accessor('ueber', { header: t('posteingang.team.ueber'), cell: (c) => zahl(c.getValue(), true) }),
    spalte.accessor('zurueck', {
      header: t('posteingang.team.zurueck'),
      cell: (c) => zahl(c.getValue()),
      meta: { nurBreit: true },
    }),
    spalte.accessor('warten', {
      header: t('posteingang.team.warten'),
      cell: (c) => zahl(c.getValue()),
      meta: { nurBreit: true },
    }),
    spalte.accessor('mitte_min', {
      header: t('posteingang.team.mitte'),
      cell: (c) => {
        const v = c.getValue()
        return <span className="zahlen">{v == null ? '–' : dauer(v, sprache)}</span>
      },
    }),
  ])
}

/**
 * Team-Übersicht für wer verteilt und die Geschäftsleitung: wie viele Mails jede Person offen hat, wie viele über
 * der Frist, wer abwesend ist und wer vertritt. Nur Zahlen, keine Inhalte fremder Postfächer.
 */
export function TeamUebersicht() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const team = useTeam()
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t('posteingang.team.text')}</p>
      <Datentabelle
        daten={team.data ?? []}
        spalten={teamSpalten(t, sprache)}
        kennung={(z) => z.person_id}
        laedt={team.isPending}
        fehler={team.error}
        onNochmal={() => void team.refetch()}
        beschriftung={t('posteingang.reiter.team')}
        leer={<Leerzustand icon={Users} titel={t('posteingang.team.leer')} text={t('posteingang.leer.text')} />}
      />
    </div>
  )
}
