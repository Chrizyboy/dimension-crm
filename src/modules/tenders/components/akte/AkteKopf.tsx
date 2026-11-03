import { ArrowLeft, ExternalLink, FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { PRIO_TON, STATUS_TON, ortKurz } from '../../lib/anzeige'
import type { Dossier } from '../../types'
import { DossierAktionen } from '../DossierAktionen'

/** Nur Links ins Web öffnen (die Quelle ist eine Angabe von aussen, Regel 7). */
const webLink = (s: string | null) => (s && /^https?:\/\//i.test(s) ? s : null)

/** Kopf der Akte: zurück, Nummer und Quelle, Titel, Marken, verantwortlich und die möglichen Entscheide. */
export function AkteKopf({ d, onZurueck }: { d: Dossier; onZurueck: () => void }) {
  const { t } = useTranslation()
  const link = webLink(d.quell_url)
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <Button variant="ghost" size="sm" onClick={onZurueck}>
            <ArrowLeft />
            {t('ausschreibungen.akte.zurueck')}
          </Button>
          <span className="zahlen font-mono">{d.nummer}</span>
          <span>·</span>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent-ink inline-flex items-center gap-1 underline"
            >
              {t(`ausschreibungen.quelle.${d.quelle}`, { defaultValue: d.quelle })}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : (
            <span>{t(`ausschreibungen.quelle.${d.quelle}`, { defaultValue: d.quelle })}</span>
          )}
        </div>
        <h1 className="font-display text-xl font-semibold text-balance">{d.titel}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          {d.prioritaet && (
            <Badge ton={PRIO_TON[d.prioritaet]}>{t('ausschreibungen.prio', { prio: d.prioritaet })}</Badge>
          )}
          <Badge ton={STATUS_TON[d.status]} punkt>
            {t(`ausschreibungen.status.${d.status}`)}
          </Badge>
          <Badge>{t(`ausschreibungen.spur.${d.spur}`)}</Badge>
          <Badge>{t(`ausschreibungen.art.${d.art}`)}</Badge>
          {d.verfahren && <Badge>{t(`ausschreibungen.verfahren.${d.verfahren}`)}</Badge>}
          <Badge ton="info">
            {[
              d.standort,
              ortKurz(d),
              d.fahrzeit_min != null ? t('ausschreibungen.fahrzeit', { min: d.fahrzeit_min }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Badge>
          {d.korrigiert_am && <Badge ton="warnung">{t('ausschreibungen.akte.korrigiert')}</Badge>}
          {d.verantwortlich && (
            <span className="text-muted-foreground text-xs">
              {t('ausschreibungen.akte.verantwortlich', { name: d.verantwortlich })}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{t(`ausschreibungen.spurHilfe.${d.spur}`)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {d.projekt_id && (
          <a
            href={`#/projects?projekt=${d.projekt_id}`}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            <FolderOpen />
            {t('ausschreibungen.akte.projekt')}
          </a>
        )}
        <DossierAktionen dossier={d} />
      </div>
    </div>
  )
}
