import { useQuery } from '@tanstack/react-query'
import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import { cn } from '@/lib/utils'
import { microsoftVerfuegbar } from '@/services/anmeldung'
import { useVerbindungsStatus } from '@/services/integrationen'
import { supabase } from '@/services/supabase'
import { pruefpunkte, type Pruefpunkt } from '../lib/betrieb'
import { ladeBetrieb } from '../services/sicherung'

const ICON = { ok: CircleCheck, offen: CircleDashed, fehlt: CircleAlert } as const
const FARBE = { ok: 'text-ok', offen: 'text-warn', fehlt: 'text-bad' } as const

/**
 * Einstellungen › Betrieb: Ist das CRM bereit für das Team? Eine Liste mit grün, gelb, rot und dem nächsten
 * Schritt, damit der Umzug in die Cloud (docs/umzug.md) Schritt für Schritt abgehakt werden kann.
 */
export function Betrieb() {
  const { t } = useTranslation()
  const an = Boolean(supabase)
  const stand = useQuery({ queryKey: ['einstellungen', 'betrieb'], queryFn: ladeBetrieb, enabled: an })
  const status = useVerbindungsStatus()
  const microsoft = useQuery({ queryKey: ['anmeldung', 'microsoft'], queryFn: microsoftVerfuegbar, enabled: an })

  if (stand.error) return <Fehlerzustand details={stand.error.message} onNochmal={() => void stand.refetch()} />
  if (stand.isPending || status.isPending || microsoft.isPending) {
    return (
      <Karte className="flex flex-col gap-2 p-4">
        {[1, 2, 3, 4].map((i) => (
          <Skelett key={i} className="h-12" />
        ))}
      </Karte>
    )
  }

  const punkte = pruefpunkte({
    stand: stand.data,
    dienste: status.data?.eingerichtet ?? null,
    microsoftAnmeldung: microsoft.data === true,
    jetzt: new Date(),
  })
  const offen = punkte.filter((p) => p.stand !== 'ok').length

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex flex-col items-start gap-1 text-left">
        <KarteTitel>{t('betrieb.titel')}</KarteTitel>
        <p className="text-muted-foreground text-sm" role="status">
          {offen === 0 ? t('betrieb.allesBereit') : t('betrieb.offen', { count: offen })}
        </p>
      </KarteKopf>
      <KarteInhalt className="p-0">
        <ul className="divide-y">
          {punkte.map((p) => (
            <Zeile key={p.id} p={p} />
          ))}
        </ul>
      </KarteInhalt>
    </Karte>
  )
}

function Zeile({ p }: { p: Pruefpunkt }) {
  const { t } = useTranslation()
  const Icon = ICON[p.stand]
  return (
    <li className="flex items-start gap-3 px-4 py-3 text-sm">
      <Icon className={cn('mt-0.5 size-5 shrink-0', FARBE[p.stand])} aria-label={t(`betrieb.stand.${p.stand}`)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{t(`betrieb.punkt.${p.id}.titel`)}</span>
        <span className="text-muted-foreground">
          {t(`betrieb.punkt.${p.id}.${p.stand}`, {
            ...p.werte,
            zeit: p.werte.zeit ? formatDatumZeit(p.werte.zeit as string) : '',
          })}
        </span>
      </div>
    </li>
  )
}
