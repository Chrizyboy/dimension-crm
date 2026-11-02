import { Bot, FileText, Mail, MessageSquareText, Paperclip, Reply, Sparkles } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { cn } from '@/lib/utils'
import { STATUS_TON, vorschau, wartetStunden, zeitpunkt } from '../lib/anzeige'
import type { AusgangEintrag, AusgangGruppe } from '../types'

const KANAL_ICON = { mail: Mail, sms: MessageSquareText, brief: FileText } as const

/**
 * Liste der Werkbank: Gruppen (Serien zuerst, dann heute, gestern, älter), je Zeile Empfänger, Betreff und die
 * wichtigsten Marken. Ankreuzen für mehrere auf einmal; eine Serie lässt sich als Ganzes wählen.
 */
export function AusgangListe({
  gruppen,
  aktiveId,
  gewaehlt,
  onOeffnen,
  onWahl,
}: {
  gruppen: AusgangGruppe[]
  aktiveId: string | null
  gewaehlt: Set<string>
  onOeffnen: (id: string) => void
  onWahl: (ids: string[], an: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col" role="list" aria-label={t('ausgang.titel')}>
      {gruppen.map((g) => {
        const alleGewaehlt = g.eintraege.every((e) => gewaehlt.has(e.id))
        return (
          <section key={g.schluessel} aria-label={gruppenTitel(g, t)} className="flex flex-col">
            <div className="bg-surface sticky top-0 z-[1] flex items-center gap-2 border-b px-3 pt-3 pb-1.5">
              {g.serie && (
                <Checkbox
                  aria-label={t('ausgang.serieWaehlen')}
                  checked={alleGewaehlt}
                  onCheckedChange={(c) => {
                    onWahl(
                      g.eintraege.map((e) => e.id),
                      c === true,
                    )
                  }}
                />
              )}
              <h3 className="text-muted-foreground flex-1 text-[11px] font-semibold tracking-wider uppercase">
                {gruppenTitel(g, t)}
              </h3>
              {g.serie && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onWahl(
                      g.eintraege.map((e) => e.id),
                      true,
                    )
                  }}
                >
                  {t('ausgang.serieAlle', { count: g.eintraege.length })}
                </Button>
              )}
            </div>
            {g.eintraege.map((e) => (
              <Zeile
                key={e.id}
                e={e}
                aktiv={e.id === aktiveId}
                gewaehlt={gewaehlt.has(e.id)}
                onOeffnen={() => {
                  onOeffnen(e.id)
                }}
                onWahl={(an) => {
                  onWahl([e.id], an)
                }}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}

function gruppenTitel(g: AusgangGruppe, t: TFunction): string {
  if (g.serie) return t('ausgang.serie', { art: t(`ausgang.art.${g.titel}`, { defaultValue: g.titel }), count: g.eintraege.length })
  return t(`ausgang.gruppe.${g.titel}`)
}

function Zeile({
  e,
  aktiv,
  gewaehlt,
  onOeffnen,
  onWahl,
}: {
  e: AusgangEintrag
  aktiv: boolean
  gewaehlt: boolean
  onOeffnen: () => void
  onWahl: (an: boolean) => void
}) {
  const { t } = useTranslation()
  const Icon = KANAL_ICON[e.kanal]
  const stunden = wartetStunden(e)
  const offen = e.status === 'wartet' || e.status === 'fehler'
  const geplant = e.sende_ab && new Date(e.sende_ab) > new Date()
  return (
    <div
      role="listitem"
      className={cn(
        'hover:bg-muted/60 grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2.5 border-b border-l-[3px] border-l-transparent px-3 py-2.5',
        aktiv && 'bg-info-soft border-l-primary hover:bg-info-soft',
      )}
    >
      <Checkbox
        className="mt-0.5"
        aria-label={t('ausgang.waehlen', { name: e.kunde ?? e.an })}
        checked={gewaehlt}
        onCheckedChange={(c) => {
          onWahl(c === true)
        }}
      />
      <button
        type="button"
        onClick={onOeffnen}
        aria-current={aktiv ? 'true' : undefined}
        className="focus-visible:ring-ring flex min-w-0 flex-col gap-0.5 rounded text-left outline-none focus-visible:ring-2"
      >
        <span className="flex items-baseline justify-between gap-2 text-sm">
          <span className="flex min-w-0 items-center gap-1.5">
            <Icon className="text-muted-foreground size-3.5 shrink-0" aria-label={t(`ausgang.kanal.${e.kanal}`)} />
            <span className="truncate font-medium">{e.kunde ?? e.an}</span>
          </span>
          <span className="zahlen text-muted-foreground shrink-0 text-xs">
            {zeitpunkt(e.gesendet_am ?? e.erstellt_am)}
          </span>
        </span>
        <span className="truncate text-sm">{vorschau(e) || t('ausgang.ohneBetreff')}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1">
          <Badge>{t(`ausgang.art.${e.art}`, { defaultValue: e.art })}</Badge>
          {!offen && (
            <Badge ton={STATUS_TON[e.status]} punkt>
              {t(`ausgang.status.${e.status}`)}
            </Badge>
          )}
          {e.status === 'fehler' && (
            <Badge ton="kritisch" punkt>
              {t('ausgang.status.fehler')}
            </Badge>
          )}
          {e.zurueck_am && e.status === 'wartet' && <Badge ton="info">{t('ausgang.zurueckVon', { name: e.zurueck_von ?? '' })}</Badge>}
          {offen && stunden >= 24 && <Badge ton="warnung">{t('ausgang.seitStunden', { count: stunden })}</Badge>}
          {geplant && <Badge ton="info">{t('ausgang.geplantFuer', { zeit: zeitpunkt(e.sende_ab ?? '') })}</Badge>}
          {e.anhaenge.length > 0 && (
            <Badge>
              <Paperclip />
              {e.anhaenge.length}
            </Badge>
          )}
          {e.ki_status === 'fertig' && (
            <Badge ton="marke">
              <Sparkles />
              {t('ausgang.kiText')}
            </Badge>
          )}
          {e.automatisch && (
            <Badge>
              <Bot />
              {t('ausgang.automatisch')}
            </Badge>
          )}
          {e.antwort_am && (
            <Badge ton="ok">
              <Reply />
              {t('ausgang.antwort')}
            </Badge>
          )}
          {e.kanal === 'brief' && e.status === 'gesendet' && (
            <Badge ton={e.ruecklauf_am ? 'ok' : 'warnung'}>
              {t(e.ruecklauf_am ? 'ausgang.brief.zurueck' : 'ausgang.brief.offen')}
            </Badge>
          )}
          {offen && !e.darf_freigeben && <Badge>{t('ausgang.nichtMeins')}</Badge>}
          {e.vorbereitet_von && offen && <span className="text-muted-foreground text-xs">{t('ausgang.von', { name: e.vorbereitet_von })}</span>}
        </span>
      </button>
    </div>
  )
}
