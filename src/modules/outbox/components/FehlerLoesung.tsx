import { CheckCheck, RefreshCw, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { fehlerText } from '@/services/integrationen'
import { fehlerLoesung } from '../lib/anzeige'
import type { AusgangEintrag } from '../types'

/**
 * Fehler mit Lösung statt nur «Fehler»: was passiert ist, was man tun kann. «Unklar, ob angekommen» heisst: zuerst in
 * Outlook unter «Gesendete Elemente» schauen, dann entweder als gesendet markieren oder nochmals senden.
 */
export function FehlerLoesung({
  e,
  laeuft,
  onNochmal,
  onAlsGesendet,
  onAbsenderIch,
}: {
  e: AusgangEintrag
  laeuft: boolean
  onNochmal: () => void
  onAlsGesendet: () => void
  onAbsenderIch: () => void
}) {
  const { t } = useTranslation()
  const loesung = fehlerLoesung(e)
  return (
    <div role="alert" className="bg-bad-soft flex flex-col gap-2 rounded-lg p-3 text-sm">
      <p className="text-bad font-semibold">
        {e.fehler ? fehlerText(new Error(e.fehler)) : t('ausgang.status.fehler')}
      </p>
      <p>{t(`ausgang.loesung.${loesung}`, { name: e.absender ?? '' })}</p>
      <div className="flex flex-wrap gap-2">
        {loesung === 'outlook' && (
          <>
            <a href="#/konto" className="text-primary text-sm underline-offset-4 hover:underline">
              {t('ausgang.loesungKnopf.verbinden')}
            </a>
            {e.kanal === 'mail' && (
              <Button size="sm" variant="secondary" laedt={laeuft} onClick={onAbsenderIch}>
                <UserRound />
                {t('ausgang.loesungKnopf.ausMeinem')}
              </Button>
            )}
          </>
        )}
        {loesung === 'unklar' && (
          <Button size="sm" variant="secondary" laedt={laeuft} onClick={onAlsGesendet}>
            <CheckCheck />
            {t('ausgang.loesungKnopf.alsGesendet')}
          </Button>
        )}
        <Button size="sm" laedt={laeuft} disabled={!e.darf_freigeben} onClick={onNochmal}>
          <RefreshCw />
          {t('ausgang.loesungKnopf.nochmal')}
        </Button>
      </div>
    </div>
  )
}
