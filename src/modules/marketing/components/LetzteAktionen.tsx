import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import { useKampagnen } from '../hooks/useMarketing'

/** «Letzte Aktionen» (V233): Serienbriefe, Serien-Mails, Newsletter und Adresslisten mit Anzahl, wann und wer. */
export function LetzteAktionen() {
  const { t } = useTranslation()
  const { data } = useKampagnen()
  if (!data?.length) return null
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel className="flex items-center gap-2">
          <History className="size-4" aria-hidden="true" />
          {t('marketing.letzte.titel')}
        </KarteTitel>
      </KarteKopf>
      <KarteInhalt>
        <ul className="divide-y text-sm">
          {data.slice(0, 10).map((k) => (
            <li key={k.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{t(`marketing.letzte.art.${k.art}`)}</span>
                {k.betreff ? ` · ${k.betreff}` : ''}
              </span>
              <span className="text-muted-foreground zahlen text-xs">
                {t('marketing.letzte.zeile', {
                  anzahl: k.anzahl ?? 0,
                  wann: formatDatumZeit(k.versendet_am),
                  wer: k.versendet_von ?? '',
                })}
              </span>
            </li>
          ))}
        </ul>
      </KarteInhalt>
    </Karte>
  )
}
