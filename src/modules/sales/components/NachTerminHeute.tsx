import { ArrowRight, CalendarCheck, FileText, ThumbsDown } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useGeschaefte } from '../hooks/useVerkauf'
import { gehoertZu } from '../lib/zutun'
import type { Geschaeft } from '../types'

const StandWechselDialog = lazy(() => import('./StandWechselDialog'))

/**
 * «Nach dem Termin: wie weiter?» für «Mein Tag» (V234 V73): meine Leads, deren Besuch vorbei ist und die noch
 * keinen nächsten Schritt haben, mit «Zur Offerte» und «Kein Interesse» direkt in der Zeile.
 * Ist nichts offen, erscheint die Karte nicht.
 */
export default function NachTerminHeute() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const geschaefte = useGeschaefte()
  const [wechsel, setWechsel] = useState<{ g: Geschaeft; ziel: 'offerte' | 'kein' } | null>(null)
  const liste = (geschaefte.data ?? [])
    .filter((g) => g.stand === 'nach_termin' && gehoertZu(g, ich?.id ?? null))
    .sort((a, b) => (a.terminAm ?? '').localeCompare(b.terminAm ?? ''))
  if (liste.length === 0) return null
  return (
    <Karte className="overflow-hidden" data-testid="tag-nach-termin">
      <KarteKopf className="flex items-center justify-between gap-2">
        <KarteTitel className="flex items-center gap-2">
          <CalendarCheck className="text-muted-foreground size-4" aria-hidden="true" />
          {t('verkauf.heute.nachTermin')}
          <Badge ton="marke">{String(liste.length)}</Badge>
        </KarteTitel>
        <a
          href="#/sales?ansicht=zutun"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          {t('verkauf.heute.alle')}
          <ArrowRight className="size-3.5" />
        </a>
      </KarteKopf>
      <ul className="divide-y">
        {liste.slice(0, 6).map((g) => (
          <li key={g.id} className="hover:bg-surface-2 flex flex-col gap-1.5 px-4 py-2 text-sm">
            <a href={`#/sales?lead=${g.id}`} className="flex min-w-0 flex-col">
              <span className="line-clamp-2 font-medium">{g.name}</span>
              <span className="text-muted-foreground text-xs">
                {[
                  g.terminAm
                    ? t('verkauf.heute.terminAm', { datum: formatDatum(g.terminAm) })
                    : t('verkauf.heute.ohneDatum'),
                  [g.plz, g.ort].filter(Boolean).join(' '),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </a>
            <span className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setWechsel({ g, ziel: 'offerte' })
                }}
              >
                <FileText />
                {t('verkauf.heute.zurOfferte')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setWechsel({ g, ziel: 'kein' })
                }}
              >
                <ThumbsDown />
                {t('verkauf.heute.keinInteresse')}
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <Suspense>
        {wechsel && (
          <StandWechselDialog
            geschaeft={wechsel.g}
            ziel={wechsel.ziel}
            onSchliessen={() => {
              setWechsel(null)
            }}
          />
        )}
      </Suspense>
    </Karte>
  )
}
