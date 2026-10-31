import { useQueryClient } from '@tanstack/react-query'
import { Car, Hammer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useTag, useZeiten } from '../hooks/useBaustelle'
import { PLAN_TAGE, dauerText, heute, minuten, plusTage, wochenStart, zuerich } from '../lib/zeit'
import { zeitStarten } from '../services/monteur'
import type { ZeitArt } from '../types'
import { ZeitLaeuft } from './ZeitLaeuft'

const OHNE = 'ohne'

/**
 * Stempeluhr für die einfache Monteur-Ansicht: ein Klick startet Arbeit oder Reise, «Stopp» beendet sie.
 * Läuft über dieselbe Warteschlange wie die Baustelle, funktioniert also auch im Funkloch. Hat die Person heute
 * Einsätze, wird die Zeit dem gewählten Projekt zugeordnet, damit die Nachkalkulation stimmt.
 */
export default function Stempeluhr() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const tag = heute()
  // Gleicher Zeitraum wie «Mein Plan», damit beide dieselbe Kopie am Gerät nutzen.
  const plan = useTag(tag, plusTage(tag, PLAN_TAGE - 1), null)
  const woche = useZeiten(wochenStart(tag), tag, ich?.id ?? null)
  const projekte = [
    ...new Map(
      (plan.data?.eintraege ?? [])
        .filter((e) => e.von <= tag && e.bis >= tag)
        .flatMap((e) => (e.projekt ? [[e.projekt.id, e] as const] : [])),
    ).values(),
  ]
  const [projekt, setProjekt] = useState<string | null>(null)
  const gewaehlt = projekt ?? projekte[0]?.projekt?.id ?? OHNE
  const [startet, setStartet] = useState<ZeitArt | null>(null)

  async function starten(art: ZeitArt) {
    setStartet(art)
    try {
      await zeitStarten({ projekt_id: gewaehlt === OHNE ? null : gewaehlt, art })
      await qc.invalidateQueries({ queryKey: ['baustelle'] })
    } catch {
      melde('kritisch', { de: 'Zeit nicht gestartet', fr: 'Temps non démarré' })
    } finally {
      setStartet(null)
    }
  }

  const laufend = plan.data?.laufend ?? null
  const zeiten = woche.data ?? []
  const summe = (liste: typeof zeiten) => liste.reduce((s, z) => s + minuten(z), 0)
  const heuteListe = zeiten.filter((z) => z.tag === tag)

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('einfach.zeit.titel')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-4">
        {plan.isPending ? (
          <Skelett className="h-24" />
        ) : laufend ? (
          <ZeitLaeuft laufend={laufend} />
        ) : (
          <>
            {projekte.length > 0 && (
              <Auswahl
                aria-label={t('einfach.zeit.baustelle')}
                value={gewaehlt}
                onValueChange={setProjekt}
                optionen={[
                  ...projekte.map((e) => ({
                    wert: e.projekt?.id ?? '',
                    text: [e.projekt?.nummer, e.kunde.name, e.adresse.ort].filter(Boolean).join(' · '),
                  })),
                  { wert: OHNE, text: t('einfach.zeit.ohneBaustelle') },
                ]}
              />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                className="h-16 text-base"
                laedt={startet === 'arbeit'}
                onClick={() => void starten('arbeit')}
              >
                <Hammer />
                {t('baustelle.zeit.startArbeit')}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="h-16 text-base"
                laedt={startet === 'reise'}
                onClick={() => void starten('reise')}
              >
                <Car />
                {t('baustelle.zeit.startReise')}
              </Button>
            </div>
          </>
        )}

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-surface-2 rounded-md p-3">
            <dt className="text-muted-foreground text-xs">{t('einfach.zeit.heute')}</dt>
            <dd className="zahlen text-lg font-semibold">{dauerText(summe(heuteListe))}</dd>
          </div>
          <div className="bg-surface-2 rounded-md p-3">
            <dt className="text-muted-foreground text-xs">{t('einfach.zeit.woche')}</dt>
            <dd className="zahlen text-lg font-semibold">{dauerText(summe(zeiten))}</dd>
          </div>
        </dl>

        {heuteListe.length > 0 && (
          <ul className="divide-y rounded-md border text-sm">
            {heuteListe.map((z) => (
              <li key={z.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="zahlen">
                    {zuerich(z.start).zeit}–{z.stopp ? zuerich(z.stopp).zeit : '…'}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {t(`einfach.zeit.art.${z.art}`)}
                    {z.projekt_nummer ? ` · ${z.projekt_nummer}` : ''}
                  </span>
                </span>
                <span className="zahlen shrink-0">{dauerText(minuten(z))}</span>
              </li>
            ))}
          </ul>
        )}
      </KarteInhalt>
    </Karte>
  )
}
