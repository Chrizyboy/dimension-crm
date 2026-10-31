import { CalendarOff, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useUi } from '@/stores/ui'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAbwesenheiten, useTag } from '../hooks/useBaustelle'
import { adressText, naviLink } from '../lib/links'
import { PLAN_TAGE, heute, plusTage } from '../lib/zeit'

const WOCHENTAG = { de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], fr: ['di', 'lu', 'ma', 'me', 'je', 've', 'sa'] }

/** «Mo 03.11.» bzw. «lu 03.11.» */
function tagText(datum: string, sprache: 'de' | 'fr'): string {
  const d = new Date(`${datum}T12:00:00Z`)
  return `${WOCHENTAG[sprache][d.getUTCDay()] ?? ''} ${datum.slice(8, 10)}.${datum.slice(5, 7)}.`
}

/**
 * «Mein Plan» für die einfache Monteur-Ansicht: die nächsten zwei Wochen Tag für Tag mit Baustelle (Tippen
 * öffnet die Navigation) und Abwesenheiten (Ferien, Krank, Kurs, «Abwesend» aus Outlook). Nur lesen, das Büro
 * plant. Werktage ohne Eintrag zeigen «nichts geplant», Wochenenden nur mit Eintrag.
 */
export default function MeinPlan() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const von = heute()
  const bis = plusTage(von, PLAN_TAGE - 1)
  const plan = useTag(von, bis, null)
  const abwesend = useAbwesenheiten(von, bis, ich?.id ?? null)
  const art = useAuswahl('abwesenheit')

  const tage = Array.from({ length: PLAN_TAGE }, (_, i) => plusTage(von, i)).map((tag) => ({
    tag,
    wochenende: [0, 6].includes(new Date(`${tag}T12:00:00Z`).getUTCDay()),
    einsaetze: (plan.data?.eintraege ?? []).filter((e) => e.von <= tag && e.bis >= tag),
    abwesend: (abwesend.data ?? []).filter((a) => a.von <= tag && a.bis >= tag),
  }))
  const sichtbar = tage.filter((d) => !d.wochenende || d.einsaetze.length > 0 || d.abwesend.length > 0)

  return (
    <Karte className="overflow-hidden">
      <KarteKopf>
        <KarteTitel>{t('einfach.plan.titel')}</KarteTitel>
      </KarteKopf>
      {plan.isPending ? (
        <Skelett className="m-4 h-32" />
      ) : (
        <ul className="divide-y text-sm">
          {sichtbar.map((d) => (
            <li key={d.tag} className={d.tag === von ? 'bg-accent-soft/40' : undefined}>
              <div className="flex gap-3 px-4 py-2">
                <span className="zahlen text-muted-foreground w-16 shrink-0 pt-0.5 text-xs font-medium">
                  {d.tag === von ? t('einfach.zeit.heute') : tagText(d.tag, sprache)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {d.abwesend.map((a) => (
                    <span key={a.id} className="flex items-center gap-1.5">
                      <CalendarOff className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                      <Badge ton={a.art === 'ferien' ? 'info' : a.art === 'krank' ? 'warnung' : 'neutral'}>
                        {art.text(a.art)}
                        {a.halbtag ? ` · ${t('einfach.plan.halbtag')}` : ''}
                      </Badge>
                    </span>
                  ))}
                  {d.einsaetze.map((e) => {
                    const link = naviLink(e.adresse)
                    const ort = adressText(e.adresse)
                    return (
                      <span key={`${e.typ}-${e.id}`} className="flex min-w-0 flex-col">
                        <span className="line-clamp-2 font-medium">
                          {[e.projekt?.nummer ?? e.service?.nummer, e.kunde.name].filter(Boolean).join(' · ')}
                          {e.zeit ? <span className="text-muted-foreground font-normal"> · {e.zeit}</span> : null}
                        </span>
                        {ort &&
                          (link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent-ink flex items-center gap-1 text-xs underline-offset-2 hover:underline"
                            >
                              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                              <span className="line-clamp-2">{ort}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">{ort}</span>
                          ))}
                      </span>
                    )
                  })}
                  {d.einsaetze.length === 0 && d.abwesend.length === 0 && (
                    <span className="text-muted-foreground">{t('einfach.plan.nichts')}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
