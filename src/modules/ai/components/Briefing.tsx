import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, RefreshCw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import { fehlerText } from '@/services/integrationen'
import { rufeKi, useKiStatus } from '@/services/ki'
import { useUi } from '@/stores/ui'
import type { Briefing as BriefingTyp } from '../types'

interface Antwort {
  briefing: BriefingTyp
  erstellt_am: string
  aus_speicher: boolean
}

/** Wohin ein Verweis aus dem Briefing führt. */
function Ziel({ verweis: r, children }: { verweis: string; children: React.ReactNode }) {
  const [art, id = ''] = r.split(':')
  const k = 'hover:underline'
  if (art === 'lead')
    return (
      <Link to="/sales" search={{ lead: id }} className={k}>
        {children}
      </Link>
    )
  if (art === 'offerte')
    return (
      <Link to="/quotes" search={{ offerte: id }} className={k}>
        {children}
      </Link>
    )
  if (art === 'projekt')
    return (
      <Link to="/projects" search={{ projekt: id }} className={k}>
        {children}
      </Link>
    )
  if (art === 'service')
    return (
      <Link to="/aftersales" search={{ fall: id }} className={k}>
        {children}
      </Link>
    )
  if (art === 'aufgabe')
    return (
      <Link to="/tasks" className={k}>
        {children}
      </Link>
    )
  return <>{children}</>
}

/**
 * Tagesbriefing pro Person (Bau-Auftrag 3.4, «Heute»): Termine, fällige Aufgaben, neue Leads, Offerten zum
 * Nachfassen und wartende Mails, von der KI zu den drei bis fünf wichtigsten Punkten verdichtet. Einmal pro Tag
 * erstellt, danach aus dem Speicher (kostet nichts). Ist die KI aus oder das Limit erreicht, bleibt die Karte weg.
 */
export default function Briefing() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const qc = useQueryClient()
  const status = useKiStatus()
  const bereit = Boolean(status.data?.eingerichtet && status.data.aktiv)
  const b = useQuery({
    queryKey: ['ki', 'briefing', sprache],
    enabled: bereit,
    staleTime: 30 * 60_000,
    retry: false,
    queryFn: () => rufeKi<Antwort>('briefing', { sprache }),
  })
  if (!bereit) return null
  const neu = async () => {
    const r = await rufeKi<Antwort>('briefing', { sprache, neu: true })
    qc.setQueryData(['ki', 'briefing', sprache], r)
    void qc.invalidateQueries({ queryKey: ['ki', 'status'] })
  }

  return (
    <Karte className="overflow-hidden" data-testid="ki-briefing">
      <KarteKopf className="flex items-center justify-between gap-2">
        <KarteTitel className="flex items-center gap-2">
          <Sparkles className="text-accent size-4" aria-hidden="true" />
          {t('ki.briefing.titel')}
        </KarteTitel>
        {b.data && (
          <Button size="sm" variant="ghost" onClick={() => void neu()} aria-label={t('ki.briefing.neu')}>
            <RefreshCw />
          </Button>
        )}
      </KarteKopf>
      <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
        {b.isPending ? (
          <>
            <Skelett className="h-5 w-1/2" />
            <Skelett className="h-16" />
          </>
        ) : b.error ? (
          <p className="text-muted-foreground text-sm">{fehlerText(b.error)}</p>
        ) : (
          <>
            <p className="font-medium">{b.data.briefing.gruss}</p>
            <p className="text-muted-foreground text-sm">{b.data.briefing.einleitung}</p>
            <ol className="flex flex-col gap-2">
              {b.data.briefing.prioritaeten.map((p, i) => (
                <li key={`${p.titel}-${i}`} className="flex gap-3 text-sm">
                  <span className="bg-accent-soft text-accent-ink zahlen flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium">
                      {p.ref ? (
                        <Ziel verweis={p.ref}>
                          {p.titel}
                          <ArrowRight className="ml-1 inline size-3.5" aria-hidden="true" />
                        </Ziel>
                      ) : (
                        p.titel
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">{p.warum}</div>
                  </div>
                </li>
              ))}
            </ol>
            {b.data.briefing.hinweis && (
              <p className="bg-info-soft text-info rounded-md px-3 py-2 text-xs">{b.data.briefing.hinweis}</p>
            )}
            <p className="text-muted-foreground text-[11px]">
              {t('ki.vorschlagVom', { datum: formatDatumZeit(b.data.erstellt_am) })}
            </p>
          </>
        )}
      </div>
    </Karte>
  )
}
