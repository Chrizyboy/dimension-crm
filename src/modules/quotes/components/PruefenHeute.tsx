import { ArrowRight, FileSearch, Send } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useEingang } from '../hooks/useOfferten'
import { zuPruefen } from '../lib/pruefen'
import type { Eingang } from '../types'

const EingangStatusDialog = lazy(() => import('./EingangStatusDialog'))

/**
 * «Offerten prüfen & senden» für «Mein Tag» (V234 V84/V212): Offerten, die der Innendienst mir zur Prüfung
 * gegeben hat (ich hatte den Termin), und meine Richtofferten. «Prüfen» öffnet sie, «Versendet» hält den
 * Versand fest. Ist nichts offen, erscheint die Karte nicht.
 */
export default function PruefenHeute() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const eingang = useEingang()
  const [versendet, setVersendet] = useState<Eingang | null>(null)
  const liste = zuPruefen(eingang.data ?? [], ich)
  if (liste.length === 0) return null
  return (
    <Karte className="overflow-hidden" data-testid="tag-pruefen">
      <KarteKopf className="flex items-center justify-between gap-2">
        <KarteTitel className="flex items-center gap-2">
          <FileSearch className="text-muted-foreground size-4" aria-hidden="true" />
          {t('offerten.heute.pruefen')}
          <Badge ton="marke">{String(liste.length)}</Badge>
        </KarteTitel>
        <a
          href="#/quotes?ansicht=eingang"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          {t('offerten.heute.alle')}
          <ArrowRight className="size-3.5" />
        </a>
      </KarteKopf>
      <ul className="divide-y">
        {liste.slice(0, 6).map((e) => (
          <li key={e.id} className="hover:bg-surface-2 flex flex-col gap-1.5 px-4 py-2 text-sm">
            <a href={`#/quotes?ansicht=eingang&lead=${e.id}`} className="flex min-w-0 flex-col">
              <span className="line-clamp-2 font-medium">{e.name}</span>
              <span className="text-muted-foreground text-xs">
                {[
                  [e.plz, e.ort].filter(Boolean).join(' '),
                  e.richtofferte
                    ? t(`offerten.heute.richt_${e.status === 'pruefung' ? 'bereit' : e.status}`)
                    : t('offerten.heute.zurPruefung'),
                  e.seit ? t('offerten.heute.seit', { datum: formatDatum(e.seit) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {e.hinweis && (
                <span className="text-warn line-clamp-2 text-xs">
                  {t('offerten.heute.hinweis', { text: e.hinweis })}
                </span>
              )}
            </a>
            <span className="flex flex-wrap gap-1.5">
              <a
                href={`#/quotes?ansicht=eingang&lead=${e.id}`}
                className={buttonVariants({ size: 'sm', variant: 'secondary' })}
              >
                <FileSearch />
                {t('offerten.heute.pruefenKnopf')}
              </a>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setVersendet(e)
                }}
              >
                <Send />
                {t('offerten.heute.versendet')}
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <Suspense>
        {versendet && (
          <EingangStatusDialog
            eintrag={versendet}
            status="offeriert"
            uebernehmen={false}
            onSchliessen={() => {
              setVersendet(null)
            }}
          />
        )}
      </Suspense>
    </Karte>
  )
}
