import { Camera } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKategorieText } from '../hooks/useKategorieText'
import { useSpesen } from '../hooks/useSpesen'
import { filtern, summe } from '../lib/spesen'
import { SpeseErfassen } from './SpeseErfassen'

const STATUS_TON = { eingereicht: 'info', ausbezahlt: 'ok', storniert: 'neutral' } as const

/**
 * Spesen für die einfache Monteur-Ansicht: ein grosser Knopf «Spese erfassen» (Foto, Betrag, fertig) und die
 * letzten eigenen Spesen mit Stand, damit man sieht, was schon ausbezahlt ist.
 */
export default function SpesenSchnell() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const kategorie = useKategorieText()
  const [neu, setNeu] = useState(false)
  const liste = useSpesen(ich?.id ?? null, Boolean(ich)).data ?? []
  const offen = filtern(liste, 'offen')
  if (!ich) return null

  return (
    <Karte>
      <KarteKopf className="flex items-center justify-between gap-3">
        <KarteTitel>{t('spesen.titel')}</KarteTitel>
        {offen.length > 0 && (
          <Badge ton="info">
            {t('einfach.spesen.offen', { betrag: formatChf(summe(offen), { mitWaehrung: true }) })}
          </Badge>
        )}
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-4">
        <Button
          size="lg"
          className="h-16 text-base"
          onClick={() => {
            setNeu(true)
          }}
        >
          <Camera />
          {t('einfach.spesen.erfassen')}
        </Button>
        {liste.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('einfach.spesen.keine')}</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {liste.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="line-clamp-2">{s.zweck || kategorie(s.kategorie)}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDatum(s.datum)} · {kategorie(s.kategorie)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="zahlen">{formatChf(s.betrag_rappen)}</span>
                  <Badge ton={STATUS_TON[s.status]}>{t(`spesen.status.${s.status}`)}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </KarteInhalt>
      {neu && (
        <SpeseErfassen
          personId={ich.id}
          onSchliessen={() => {
            setNeu(false)
          }}
        />
      )}
    </Karte>
  )
}
