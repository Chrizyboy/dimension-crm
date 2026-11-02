import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../../hooks/useAktion'
import { useWerbekampagnen } from '../../hooks/useKampagnen'
import { kostenZuordnen } from '../../services/kampagnen'
import { KANAELE, type Kostenbeleg } from '../../types'
import { KampagneWahl } from '../kampagnen/KampagneWahl'

/** Eine Rechnung: Kanal und Kampagne wählen, «Zuordnen» oder «Keine Werbung». */
function Beleg({ b }: { b: Kostenbeleg }) {
  const { t } = useTranslation()
  const kampagnen = useWerbekampagnen().data ?? []
  const { laeuft, aus } = useAktion()
  const [kampagne, setKampagne] = useState<string | null>(null)
  const [kanal, setKanal] = useState<string>(b.marketing_kanal ?? '')
  const art = kampagnen.find((k) => k.id === kampagne)?.art
  // Kanal aus der Kampagne vorschlagen (Messe → messe, Online → online …)
  const vorschlag = art && (KANAELE as readonly string[]).includes(art) ? art : ''
  const gewaehlt = kanal || vorschlag
  return (
    <li className="flex flex-col gap-2 px-3 py-3 text-sm">
      <span className="flex flex-wrap justify-between gap-2">
        <span className="min-w-0">
          <span className="font-medium">{b.firma}</span>{' '}
          <span className="text-muted-foreground">{b.text ?? b.kategorie ?? ''}</span>
        </span>
        <span className="zahlen shrink-0">
          {formatChf(b.betrag_rappen ?? 0, { mitWaehrung: true })}
          {b.rechnung_am ? ` · ${formatDatum(b.rechnung_am)}` : ''}
        </span>
      </span>
      <span className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <KampagneWahl id={`kosten-kampagne-${b.id}`} wert={kampagne} onWert={setKampagne} />
        <Auswahl
          aria-label={t('werbung.kosten.kanal')}
          platzhalter={t('werbung.kosten.kanal')}
          optionen={KANAELE.map((k) => ({ wert: k, text: t(`werbung.kanal.${k}`) }))}
          value={gewaehlt}
          onValueChange={setKanal}
        />
        <Button
          size="sm"
          disabled={!gewaehlt}
          laedt={laeuft}
          onClick={() => void aus(() => kostenZuordnen(b.id, kampagne, gewaehlt))}
        >
          {t('werbung.kosten.zuordnen')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={laeuft}
          onClick={() => void aus(() => kostenZuordnen(b.id, null, 'kein'))}
        >
          {t('werbung.kosten.keineWerbung')}
        </Button>
      </span>
    </li>
  )
}

/**
 * Lieferantenrechnungen aus AbaNinja, die nach Werbung aussehen (Stichworte in den Einstellungen), einer Kampagne
 * und einem Kanal zuordnen (Chris 2.11.: «Aus AbaNinja zuordnen»). Nur mit Recht Finanzen.
 */
export function KostenZuordnen({ belege }: { belege: Kostenbeleg[] }) {
  const { t } = useTranslation()
  if (!belege.length) return null
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('werbung.kosten.titel', { anzahl: belege.length })}</KarteTitel>
        <p className="text-muted-foreground text-sm">{t('werbung.kosten.info')}</p>
      </KarteKopf>
      <KarteInhalt className="p-0">
        <ul className="divide-y">
          {belege.slice(0, 10).map((b) => (
            <Beleg key={b.id} b={b} />
          ))}
        </ul>
      </KarteInhalt>
    </Karte>
  )
}
