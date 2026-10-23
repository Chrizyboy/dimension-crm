import { Link2, Link2Off, PlugZap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { useSocialStatus, useVerbindungen } from '../hooks/useMarketing'
import { trennen, verbinden } from '../services/social'

/**
 * Verbindungen zu Meta (Facebook-Seite und Instagram), LinkedIn (Firmenseite) und Canva, eine je Dienst für die
 * ganze Firma. Verbinden und Trennen nur durch die Administration; alle sehen, ob es verbunden ist.
 */
export function Verbindungen() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const sprache = useUi((z) => z.sprache)
  const admin = hatRecht(ich, 'admin')
  const { data } = useVerbindungen()
  const status = useSocialStatus()
  const { laeuft, aus } = useAktion()
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel className="flex items-center gap-2">
          <PlugZap className="size-4" aria-hidden="true" />
          {t('marketing.verbindung.titel')}
        </KarteTitel>
      </KarteKopf>
      <KarteInhalt>
        <ul className="grid gap-3 sm:grid-cols-3">
          {(data ?? []).map((v) => {
            const eingerichtet = status.data?.eingerichtet[v.dienst] ?? false
            return (
              <li key={v.dienst} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t(`marketing.verbindung.dienst.${v.dienst}`)}</span>
                  {v.verbunden && !v.fehler ? (
                    <Badge ton="ok" punkt>
                      {t('marketing.verbindung.verbundenKurz')}
                    </Badge>
                  ) : v.fehler ? (
                    <Badge ton="warnung">{t('marketing.verbindung.neuVerbinden')}</Badge>
                  ) : (
                    <Badge ton="neutral">{t('marketing.verbindung.nicht')}</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {v.verbunden
                    ? t('marketing.verbindung.wer', {
                        name: v.name ?? '',
                        von: v.von ?? '',
                        am: v.verbunden_am ? formatDatum(v.verbunden_am) : '',
                      })
                    : status.isError || !eingerichtet
                      ? t('marketing.verbindung.nichtEingerichtet')
                      : t(`marketing.verbindung.wozu.${v.dienst}`)}
                </p>
                {admin && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={v.verbunden && !v.fehler ? 'secondary' : 'primary'}
                      disabled={!eingerichtet || laeuft}
                      onClick={() => void aus(() => verbinden(v.dienst, sprache))}
                    >
                      <Link2 />
                      {v.verbunden ? t('marketing.verbindung.erneuern') : t('marketing.verbindung.verbinden')}
                    </Button>
                    {v.verbunden && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={laeuft}
                        onClick={() => void aus(() => trennen(v.dienst), { de: 'Getrennt', fr: 'Déconnecté' })}
                      >
                        <Link2Off />
                        {t('marketing.verbindung.trennen')}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </KarteInhalt>
    </Karte>
  )
}
