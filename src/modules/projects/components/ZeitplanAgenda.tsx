import { TriangleAlert, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { alsDatum, alsIso, plusTage, ueberschneidet } from '../lib/zeitplan'
import { konfliktText, tagImEinsatz, type PlanBalken, type PlanGruppe } from '../lib/zeitplanAnsicht'
import type { Abwesenheit, Person, Projekt } from '../types'

/** Kunde eines Balkens (Baustelle oder Service-Termin), zum Sortieren und Anzeigen. */
const kundeVon = (b: PlanBalken) => b.projekt?.kunde ?? b.service?.kunde ?? ''

/** Farbstreifen links an der Karte, gleiche Farben wie die Balken am PC. */
const STREIFEN: Record<string, string> = {
  intern: 'bg-primary',
  extern: 'bg-accent',
  geplant: 'border-primary border-2 border-dashed bg-surface',
  service: 'bg-info',
}

/**
 * Zeitplan am Handy: statt eines breiten Rasters eine Woche als Liste nach Tagen. Jede Baustelle als Karte
 * mit Team, «Tag 2/3» und Konflikt; oben pro Tag, wer abwesend ist. Tippen öffnet die Planung.
 */
export function ZeitplanAgenda({
  montag,
  gruppen,
  service,
  abwesend,
  personen,
  person,
  onOeffnen,
}: {
  montag: string
  gruppen: PlanGruppe[]
  /** Service-Termine als Balken (aus «Service & Garantie»). */
  service: PlanBalken[]
  abwesend: Abwesenheit[]
  personen: Person[]
  /** Nur die Einsätze dieser Person (leer = alle). */
  person: string
  onOeffnen: (p: Projekt) => void
}) {
  const { t, i18n } = useTranslation()
  const [heute] = useState(() => alsIso(new Date()))
  const sprache = i18n.language === 'fr' ? 'fr-CH' : 'de-CH'
  const alle = [
    ...gruppen
      .flatMap((g) => g.zeilen.flatMap((z) => z.balken))
      .filter((b) => b.einsatz && (!person || b.einsatz.personen.includes(person))),
    ...service.filter((b) => !person || b.service?.personen.includes(person)),
  ]
  const kuerzel = (id: string) => personen.find((p) => p.id === id)?.kuerzel ?? '?'

  const tage = Array.from({ length: 7 }, (_, i) => alsIso(plusTage(alsDatum(montag), i)))
    .map((tag) => ({
      tag,
      balken: alle
        .filter((b) => ueberschneidet(b, { von: tag, bis: tag }))
        .sort((a, b) => kundeVon(a).localeCompare(kundeVon(b))),
      weg: [
        ...new Set(abwesend.filter((a) => ueberschneidet(a, { von: tag, bis: tag })).map((a) => a.person_id)),
      ].filter((id) => !person || id === person),
    }))
    .filter((d) => {
      const wt = alsDatum(d.tag).getDay()
      return (wt !== 0 && wt !== 6) || d.balken.length > 0
    })

  return (
    <ol className="flex flex-col gap-3">
      {tage.map((d) => (
        <li key={d.tag} aria-label={d.tag} className="flex flex-col gap-1.5">
          <h3 className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <span className={cn('font-semibold', d.tag === heute && 'text-accent-ink')}>
              {alsDatum(d.tag).toLocaleDateString(sprache, { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
            {d.tag === heute && <Badge ton="marke">{t('projekte.zeitplan.heute')}</Badge>}
            {d.weg.length > 0 && (
              <span className="text-muted-foreground text-xs">
                {t('projekte.zeitplan.abwesendAm', { namen: d.weg.map(kuerzel).join(', ') })}
              </span>
            )}
          </h3>
          {d.balken.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-sm">
              {t('projekte.zeitplan.tagFrei')}
            </p>
          ) : (
            d.balken.map((b) => <Karte key={b.id} b={b} tag={d.tag} onOeffnen={onOeffnen} />)
          )}
        </li>
      ))}
    </ol>
  )
}

/** Eine Baustelle an einem Tag. */
function Karte({ b, tag, onOeffnen }: { b: PlanBalken; tag: string; onOeffnen: (p: Projekt) => void }) {
  const { t } = useTranslation()
  const p = b.projekt
  const nr = tagImEinsatz(b, tag)
  return (
    <button
      type="button"
      onClick={() => {
        if (b.service) window.location.hash = `#/aftersales?fall=${b.service.id}`
        else if (p) onOeffnen(p)
      }}
      className={cn(
        'bg-surface focus-visible:ring-ring relative flex flex-col gap-0.5 overflow-hidden rounded-lg border py-2 pr-3 pl-4 text-left shadow-xs outline-none focus-visible:ring-2',
        b.konflikt.length > 0 && 'border-bad',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1.5', STREIFEN[b.art])} />
      <span className="flex items-baseline justify-between gap-2">
        <span className="truncate font-semibold">{kundeVon(b)}</span>
        {nr.von > 1 && (
          <span className="text-muted-foreground zahlen shrink-0 text-xs">
            {t('projekte.zeitplan.tagVon', { nr: nr.nr, von: nr.von })}
          </span>
        )}
      </span>
      <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        <span>{p?.ort ?? b.service?.ort}</span>
        {b.service && (
          <span className="zahlen">
            {b.service.nummer} · {b.service.titel}
          </span>
        )}
        <span className="text-foreground flex items-center gap-1">
          <Users className="text-muted-foreground size-4" aria-hidden />
          {b.text || '–'}
        </span>
        {b.art !== 'intern' && (
          <Badge ton={b.art === 'extern' ? 'marke' : b.art === 'service' ? 'info' : 'neutral'}>
            {t(`projekte.einsatz.${b.art}`)}
          </Badge>
        )}
      </span>
      {b.konflikt.length > 0 && (
        <span className="text-bad flex items-center gap-1.5 text-sm font-medium">
          <TriangleAlert className="size-4" aria-hidden />
          {t('projekte.zeitplan.konfliktMit', { namen: konfliktText(b.konflikt, t) })}
        </span>
      )}
    </button>
  )
}
