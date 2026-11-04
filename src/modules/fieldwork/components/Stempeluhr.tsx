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
import { useUi } from '@/stores/ui'
import { useInternePosten, useTag, useZeiten } from '../hooks/useBaustelle'
import { zielText } from '../lib/anzeige'
import { PLAN_TAGE, dauerText, heute, minuten, plusTage, wochenStart, zuerich } from '../lib/zeit'
import { zielAusWert, zielOptionen } from '../lib/ziel'
import { zeitStarten } from '../services/monteur'
import type { ZeitArt } from '../types'
import { ZeitLaeuft } from './ZeitLaeuft'

/**
 * Stempeluhr: ein Klick startet Arbeit oder Reise, «Stopp» beendet sie. In der einfachen Monteur-Ansicht und
 * oben in «Mein Tag» (Rolle Montage), damit auch die Fahrt ins Lager oder zur Baustelle ohne Rapport zählt.
 * Läuft über dieselbe Warteschlange wie die Baustelle, funktioniert also auch im Funkloch. Jede Zeit braucht ein
 * Ziel (Chris 4.11.2026): die heutige Baustelle steht oben und ist gewählt, sonst ein Service-Fall oder ein
 * interner Posten wie Lager. Ohne Ziel bleibt der Start gesperrt.
 */
export default function Stempeluhr({ onRapport }: { onRapport?: (id: string) => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const tag = heute()
  // Gleicher Zeitraum wie «Mein Plan», damit beide dieselbe Kopie am Gerät nutzen.
  const plan = useTag(tag, plusTage(tag, PLAN_TAGE - 1), null)
  const woche = useZeiten(wochenStart(tag), tag, ich?.id ?? null)
  const posten = useInternePosten()
  const sprache = useUi((z) => z.sprache)
  const optionen = zielOptionen(plan.data?.eintraege ?? [], posten.data ?? [], sprache, tag)
  const heuteDa = (plan.data?.eintraege ?? []).some((e) => e.von <= tag && e.bis >= tag)
  const [wahl, setWahl] = useState<string | null>(null)
  // Ohne Einsatz heute nichts vorwählen: der Monteur soll bewusst Lager, Fahrzeug … wählen.
  const gewaehlt = wahl ?? (heuteDa ? (optionen[0]?.wert ?? '') : '')
  const ziel = zielAusWert(gewaehlt)
  const [startet, setStartet] = useState<ZeitArt | null>(null)

  async function starten(art: ZeitArt) {
    if (!ziel) return
    setStartet(art)
    try {
      await zeitStarten({ ...ziel, art })
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
          <ZeitLaeuft laufend={laufend} {...(onRapport ? { onRapport } : {})} />
        ) : (
          <>
            <Auswahl
              aria-label={t('einfach.zeit.ziel')}
              platzhalter={t('einfach.zeit.zielWaehlen')}
              value={gewaehlt}
              onValueChange={setWahl}
              optionen={optionen}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                className="h-16 text-base"
                laedt={startet === 'arbeit'}
                disabled={!ziel}
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
                disabled={!ziel}
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
                    {zielText(z, sprache) ? ` · ${zielText(z, sprache)}` : ''}
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
