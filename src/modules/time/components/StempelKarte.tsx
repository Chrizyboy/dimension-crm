import { Play, Square } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { minuten, stundenText, zuerich } from '../lib/zeit'
import { zeitStarten, zeitStoppen } from '../services/zeit'
import type { LaufendeZeit, Posten } from '../types'

/**
 * Stempeluhr fürs Büro: ein Klick startet die Zeit auf einen internen Posten (Standard «Büro»), «Stopp» beendet
 * sie mit Pause. Baustelle und Service stempelt die Montage wie bisher in «Baustelle & Rapporte»; läuft dort eine
 * Zeit, steht sie auch hier und lässt sich hier stoppen.
 */
export function StempelKarte({ laeuft, posten }: { laeuft: LaufendeZeit | null; posten: readonly Posten[] }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { laeuft: arbeitet, aus } = useAktion()
  const [wahl, setWahl] = useState(
    posten.some((p) => p.schluessel === 'buero') ? 'buero' : (posten[0]?.schluessel ?? ''),
  )
  const [pause, setPause] = useState('0')
  const name = (k: string | null) => posten.find((p) => p.schluessel === k)?.[sprache] ?? k ?? ''

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('zeit.stempel.titel')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-3">
        {laeuft ? (
          <>
            <p className="text-sm">
              <span className="zahlen text-2xl font-semibold">{stundenText(minuten(laeuft.start, null, 0) / 60)}</span>
              <span className="text-muted-foreground ml-2">
                {t('zeit.stempel.seit', { zeit: zuerich(laeuft.start).zeit })} ·{' '}
                {laeuft.intern ? name(laeuft.intern) : t('zeit.stempel.baustelle')}
              </span>
            </p>
            <Feld id="st-pause" label={t('zeit.feld.pause')}>
              <Input
                id="st-pause"
                type="number"
                inputMode="numeric"
                min={0}
                step={5}
                value={pause}
                onChange={(e) => {
                  setPause(e.target.value)
                }}
              />
            </Feld>
            <Button
              variant="danger"
              laedt={arbeitet}
              onClick={() =>
                void aus(() => zeitStoppen(laeuft.id, Number(pause) || 0), { de: 'Zeit gestoppt', fr: 'Temps arrêté' })
              }
            >
              <Square />
              {t('zeit.stempel.stopp')}
            </Button>
          </>
        ) : (
          <>
            <Feld id="st-posten" label={t('zeit.feld.posten')}>
              <Auswahl
                id="st-posten"
                value={wahl}
                onValueChange={setWahl}
                optionen={posten.map((p) => ({ wert: p.schluessel, text: p[sprache] }))}
              />
            </Feld>
            <Button
              laedt={arbeitet}
              disabled={!wahl}
              onClick={() => void aus(() => zeitStarten(wahl), { de: 'Zeit läuft', fr: 'Temps en cours' })}
            >
              <Play />
              {t('zeit.stempel.start')}
            </Button>
            <p className="text-muted-foreground text-xs">{t('zeit.stempel.hinweis')}</p>
          </>
        )}
      </KarteInhalt>
    </Karte>
  )
}
